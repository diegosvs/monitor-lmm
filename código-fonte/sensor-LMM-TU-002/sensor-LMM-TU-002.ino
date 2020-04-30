/*
 * Programa: código para ESP8266 com aplicação para aquisição de DHT22
 * Autor: Diego Silva Viana dos Santos
 * Laboratório de Metrologia Mecânica -IPT
 * 
 */
#include <stdio.h>
#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include "Thread.h"
#include "ThreadController.h"

/* Definicoes gerais */
//#define TEMPO_ENVIO_INFORMACOES    5000 //ms

/* Definicoes do sensor de temperatura */
#define DHTPIN  4   /* GPIO que o pino 2 do sensor é conectado */

/* A biblioteca serve para os sensores DHT11, DHT22 e DHT21.
   No nosso caso, usaremos o DHT22, porém se você desejar utilizar
   algum dos outros disponíveis, basta descomentar a linha correspondente.
*/
//#define DHTTYPE DHT11   // DHT 11
#define DHTTYPE DHT22   // DHT 22  (AM2302), AM2321
//#define DHTTYPE DHT21   // DHT 21 (AM2301)

/* Definicoes da UART de debug para NodeMCU v2, setar bauderate para 9600 */
#define DEBUG_UART_BAUDRATE               9600

/* MQTT definitions - tópico padrão para publicação no broker da TAGO.IO*/
//#define MQTT_PUB_TOPIC "tago/data/post"
#define MQTT_PUB_UMID "tagodata/umidade" //topico para umidade
#define MQTT_PUB_TEMP "tagodata/temperatura" //topico para temperatura

/*DEFINICOES DO DISPOSITIVO CADASTRADO NO BROKER*/
#define MQTT_USERNAME  "LMM-TU-002"  /* nome do dispositivo cadastrado */
#define MQTT_PASSWORD  "XXXXXXXXXXXXXXXXXXXXXXX"  /* coloque aqui o Device Token do seu dispositivo no Tago.io */

/* WIFI */
const char* ssid_wifi = "******";     /*  INSERIR O NOME DA REDE WIFI QUE O DISPOSITIVO SERÁ CONECTADO */
const char* password_wifi = "XXXXXXXXX"; /*  SENHA DA REDE WIFI */
WiFiClient espClient;     

/* MQTT */
const char* broker_mqtt = "mqtt.tago.io"; /* MQTT broker URL */
int broker_port = 1883;                      /* MQTT broker port - PADRÃO DA PLATAFORMA */
PubSubClient MQTT(espClient); 


bool ledteste = true; // VARIAVEL GLOBAL PARA TESTE DO LED INTERNO DA PLACA
 
/* objeto para comunicação com sensor DHT22  */
DHT dht(DHTPIN, DHTTYPE);

/* PROTÓTIPOS DAS FUNCOES UTILIZADAS*/
void init_wifi(void);
void init_MQTT(void);
void connect_MQTT(void);
void connect_wifi(void);
void verify_wifi_connection(void);
void verify_mqtt_connection(void);
void send_data_iot_platform(void);
void send_data_tago(void);
void send_data_nodered(void);
void callback(String topic, byte* payload, unsigned int length);


/* Funcao: inicializa conexao wi-fi
 * Parametros: nenhum
 * Retorno: nenhum 
 */
void init_wifi(void) 
{
    delay(10);
    Serial.println("------WI-FI -----");
    Serial.print("Tentando se conectar a rede wi-fi ");
    Serial.println(ssid_wifi);
    Serial.println("Aguardando conexao");    
    connect_wifi();
}

/* Funcao: conexao a uma rede wi-fi
 * Parametros: nenhum
 * Retorno: nenhum 
 */
void connect_wifi(void) 
  {
    if (WiFi.status() == WL_CONNECTED)
        return;
        
    WiFi.begin(ssid_wifi, password_wifi);
    
    while (WiFi.status() != WL_CONNECTED) 
    {
        delay(100);
        Serial.print(".");
    }
  
    Serial.println();
    Serial.print("Conectado com sucesso a rede wi-fi: ");
    Serial.println(ssid_wifi);
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  }

/* Funcao: verifica e garante conexao wi-fi*/
void verify_wifi_connection(void)
{
    connect_wifi(); 
}

/* Funcao: inicializa variaveis do MQTT para conexao com broker */
void init_MQTT(void)
{
    MQTT.setServer(broker_mqtt, broker_port);
    MQTT.setCallback(callback);
}

/* Funcao: conecta com broker MQTT (se nao ha conexao ativa)*/
void connect_MQTT(void) 
{
    char mqtt_id_randomico[5] = {0}; //não utilizado para fixar um id por dispositivo
    const char* mqtt_id = "1111";

    while (!MQTT.connected()) 
    {
        Serial.print("* Tentando se conectar ao broker MQTT: ");
        Serial.println(broker_mqtt);

        /* gera id mqtt randomico */
        randomSeed(random(9999));
        sprintf(mqtt_id_randomico, "%ld", random(9999));
        
        if (MQTT.connect(mqtt_id, MQTT_USERNAME, MQTT_PASSWORD)) 
        {
            Serial.println("Conectado ao broker MQTT com sucesso!");
            MQTT.subscribe("LEDPLACA");
            MQTT.subscribe("datatago");
            MQTT.subscribe("datanode");
        } 
        else 
        {
            Serial.println("Falha na tentativa de conexao com broker MQTT.");
            Serial.println("Nova tentativa em 2s...");
            delay(2000);
        }
    }
}

/* Funcao: verifica e garante conexao MQTT  */
void verify_mqtt_connection(void)
  {
    connect_MQTT();  
  }

/* Funcao: checa os tópicos enviados para o esp8266 para interação com o broker */
 void callback(String topic, byte* payload, unsigned int length) {

  String messageTemp; 
  
  for (int i = 0; i < length; i++) {     
     
    messageTemp += (char)payload[i];
  }  
  
    //Serial.print(messageTemp);
    //Serial.println();
    //Serial.print(topic);
    //Serial.println();

  if(topic=="LEDPLACA") //topico que checa se o botao de teste do dashboard do led interno foi pressionado
      {
  
      if(messageTemp == "ligar" )
        {
          ledteste=!ledteste;
        digitalWrite(LED_BUILTIN, ledteste);
        }
        
      else if(messageTemp == "desligar")
        {      
        digitalWrite(LED_BUILTIN, HIGH);
        }
      }  

  else if(topic=="datatago") //recebe o topico que aciona a funcao de envio de valores para o broker
      {
  
      if(messageTemp == "send_data_tago" )
        {
          send_data_tago();
          
        }     
      }

  else if(topic=="datanode") //recebe o topico que aciona a funcao de envio de valores para o dashboard
      {
  
      if(messageTemp == "send_data_node" )
        {
          send_data_nodered();
            
        }     
      }
       
  }

/* Funcao: envia informacoes para plataforma TAGO.IO via MQTT - o seguinte padrão deve ser obedecido:
JSON a ser enviado para Tago.io:

{
    "variable": "nome_da_variavel",
    "unit"    : "unidade",
    "value"   : valor
}
*/
void send_data_tago(void) 
  {
   StaticJsonDocument<250> tago_json_temperature;
   StaticJsonDocument<250> tago_json_humidity;
   char json_string[250] = {0};
   float temperatura_lida = dht.readTemperature();
   float umidade_lida = dht.readHumidity();
   int i;

   /* Imprime medicoes de temperatura e umidade (para debug) */
   for (i=0; i<20; i++)
       Serial.println(" ");
       
   Serial.println("----------");
   Serial.print("Temperatura: ");
   Serial.print(temperatura_lida);
   Serial.println("C");
   Serial.print("Umidade: ");
   Serial.print(umidade_lida);
   Serial.println("%");

   /* Envio da temperatura */
   tago_json_temperature["variable"] = "temperatura";
   tago_json_temperature["unit"] = "ºC";
   tago_json_temperature["value"] = temperatura_lida;
   memset(json_string, 0, sizeof(json_string));
   serializeJson(tago_json_temperature, json_string);
   MQTT.publish(MQTT_PUB_TEMP, json_string);
   //MQTT.publish("temperatura", json_string);
   //MQTT.publish("lab/temperatura", String(temperatura_lida).c_str(), true);

   /* Envio da umidade */
   tago_json_humidity["variable"] = "umidade";
   tago_json_humidity["unit"] = "%";
   tago_json_humidity["value"] = umidade_lida;
   memset(json_string, 0, sizeof(json_string));
   serializeJson(tago_json_humidity, json_string);
   MQTT.publish(MQTT_PUB_UMID, json_string);
   //MQTT.publish("umidade", json_string);
   //MQTT.publish("lab/umidade", String(umidade_lida).c_str(), true);
  
  }
  
/* Funcao: envia os valores para o dashboard da ibmcloud desenvolvido em node-red*/
void send_data_nodered(void)
  {
   float temperatura_lida = dht.readTemperature();
   float umidade_lida = dht.readHumidity();

   MQTT.publish("device/temperatura", String(temperatura_lida).c_str(), true);
   MQTT.publish("device/umidade", String(umidade_lida).c_str(), true);
  }


//ThreadController cpu;
//Thread threadFuncaoTago; //thread de envio de dados para tago.io
//Thread threadFuncaoDashboard; //thread de envio de dados para dashboard ibmcloud


void setup() 
  {
    /* UARTs setup */  
    Serial.begin(DEBUG_UART_BAUDRATE);
    pinMode(BUILTIN_LED, OUTPUT);
    
    digitalWrite(LED_BUILTIN, HIGH); //instancia o led interno da placa para teste
    
    /* Inicializa comunicacao com sensor DHT22 */
    dht.begin();

    /* Inicializa wi-fi */
    init_wifi();

    /* Inicializa MQTT e faz conexao ao broker MQTT */
    init_MQTT();
    
    connect_MQTT();
    
    //thread para fução de envio ao broker tagoIO
    //threadFuncaoTago.setInterval(600000);
    //threadFuncaoTago.onRun(send_data_tago);

    //thread para envio de informações ao dashboard em node-red
    //threadFuncaoDashboard.setInterval(5000);
    //threadFuncaoDashboard.onRun(send_data_nodered);

    //cpu.add(&threadFuncaoTago);
    //cpu.add(&threadFuncaoDashboard);
  }

void loop() 
  {
    /* Verifica e garante conectividades wi-fi e MQTT */
    
    verify_wifi_connection();
    verify_mqtt_connection();
   
   //cpu.run(); // começa a rodar as threads declaradas
     
    MQTT.loop(); //checa se alguma mensagem chegou via publish
    
    /* Faz o envio da temperatura e umidade para a plataforma IoT (Tago.io) */   
    //send_data_tago();  
    //delay(TEMPO_ENVIO_INFORMACOES);
    
    /* Faz o envio da temperatura e umidade para o dashboard no node-red */
    //send_data_nodered();
    //delay(TEMPO_ENVIO_INFORMACOES);
  }
