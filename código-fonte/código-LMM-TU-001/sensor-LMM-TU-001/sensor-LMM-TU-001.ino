/*
 * Programa: código-fonte do dispositivo IoT usado no curso
 * Autor: Pedro Bertoleti
 */
#include <stdio.h>
#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include "Thread.h"
#include "ThreadController.h"

/* Definicoes gerais */
#define TEMPO_ENVIO_INFORMACOES    1000 //ms

/* Definicoes do sensor de temperatura */
#define DHTPIN  4   /* GPIO que o pino 2 do sensor é conectado */

/* A biblioteca serve para os sensores DHT11, DHT22 e DHT21.
   No nosso caso, usaremos o DHT22, porém se você desejar utilizar
   algum dos outros disponíveis, basta descomentar a linha correspondente.
*/
//#define DHTTYPE DHT11   // DHT 11
#define DHTTYPE DHT22   // DHT 22  (AM2302), AM2321
//#define DHTTYPE DHT21   // DHT 21 (AM2301)

/* Definicoes da UART de debug */
#define DEBUG_UART_BAUDRATE               9600

/* MQTT definitions */
#define MQTT_PUB_TOPIC "tago/data/post"

#define MQTT_USERNAME  "LMM-TU-001"  /* Coloque aqui qualquer valor */
#define MQTT_PASSWORD  "810d0849-ca82-466b-9da1-9b5792bb18be"  /* coloque aqui o Device Token do seu dispositivo no Tago.io */

/* WIFI */
const char* ssid_wifi = "******";     /*  WI-FI network SSID (name) you want to connect */
const char* password_wifi = "******"; /*  WI-FI network password */
WiFiClient espClient;     

/* MQTT */
const char* broker_mqtt = "mqtt.tago.io"; /* MQTT broker URL */
int broker_port = 1883;                      /* MQTT broker port */
PubSubClient MQTT(espClient); 
bool ledteste = true;
/*
 * Variáveis e objetos globais
 */
/* objeto para comunicação com sensor DHT22  */
DHT dht(DHTPIN, DHTTYPE);

/* Prototypes */
void init_wifi(void);
void init_MQTT(void);
void connect_MQTT(void);
void connect_wifi(void);
void verify_wifi_connection(void);
void verify_mqtt_connection(void);
void send_data_iot_platform(void);
void send_data_tago(void);
void send_data_nodered(void);
void callback(String topic, byte* message, unsigned int length);


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

/* Funcao: verifica e garante conexao wi-fi
 * Parametros: nenhum
 * Retorno: nenhum 
 */
void verify_wifi_connection(void)
{
    connect_wifi(); 
}

/* Funcao: inicializa variaveis do MQTT para conexao com broker
 * Parametros: nenhum
 * Retorno: nenhum 
 */
void init_MQTT(void)
{
    MQTT.setServer(broker_mqtt, broker_port);
    MQTT.setCallback(callback);
}

/* Funcao: conecta com broker MQTT (se nao ha conexao ativa)
 * Parametros: nenhum
 * Retorno: nenhum 
 */
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

/* Funcao: verifica e garante conexao MQTT
 * Parametros: nenhum
 * Retorno: nenhum 
 */
void verify_mqtt_connection(void)
  {
    connect_MQTT();  
  }

/* Funcao: envia informacoes para plataforma IoT (Tago.io) via MQTT
 * Parametros: nenhum
 * Retorno: nenhum
 */

/*
JSON a ser enviado para Tago.io:

{
    "variable": "nome_da_variavel",
    "unit"    : "unidade",
    "value"   : valor
}
*/


 void callback(String topic, unsigned char* message, unsigned int length) {

  String messageTemp;
  
  for (int i = 0; i < length; i++) {
    
    messageTemp += (char)message[i];
  }
  
  

  // If a message is received on the topic room/lamp, you check if the message is either on or off. Turns the lamp GPIO according to the message
  if(topic=="LEDPLACA")
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

  else if(topic=="datatago")
      {
  
      if(messageTemp == "send_data_tago" )
        {
          send_data_tago();
        }     
      }

  else if(topic=="datanode")
      {
  
      if(messageTemp == "send_data_node" )
        {
          send_data_nodered();
        }     
      }
       
  }
  


void send_data_tago(void) 
  {
   StaticJsonDocument<250> tago_json_temperature;
   StaticJsonDocument<250> tago_json_humidity;
   char json_string[250] = {0};
   float temperatura_lida = dht.readTemperature();
   float umidade_lida = dht.readHumidity();
   int i;

   /* Imprime medicoes de temperatura e umidade (para debug) */
   for (i=0; i<80; i++)
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
   MQTT.publish(MQTT_PUB_TOPIC, json_string);
   //MQTT.publish("temperatura", json_string);
   //MQTT.publish("lab/temperatura", String(temperatura_lida).c_str(), true);

   /* Envio da umidade */
   tago_json_humidity["variable"] = "umidade";
   tago_json_humidity["unit"] = "%";
   tago_json_humidity["value"] = umidade_lida;
   memset(json_string, 0, sizeof(json_string));
   serializeJson(tago_json_humidity, json_string);
   MQTT.publish(MQTT_PUB_TOPIC, json_string);
   //MQTT.publish("umidade", json_string);
   //MQTT.publish("lab/umidade", String(umidade_lida).c_str(), true);
  
  }

void send_data_nodered(void)
  {
   float temperatura_lida = dht.readTemperature();
   float umidade_lida = dht.readHumidity();

   MQTT.publish("temperatura", String(temperatura_lida).c_str(), true);
   MQTT.publish("umidade", String(umidade_lida).c_str(), true);
  }

//ThreadController cpu;
//Thread threadFuncaoTago;
//Thread threadFuncaoDashboard;


void setup() 
  {
    /* UARTs setup */  
    Serial.begin(DEBUG_UART_BAUDRATE);
    pinMode(BUILTIN_LED, OUTPUT);
    digitalWrite(LED_BUILTIN, HIGH);
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
   // cpu.run(); // começa a rodar as threads declaradas
    MQTT.loop();
    /* Faz o envio da temperatura e umidade para a plataforma IoT (Tago.io) */
   
    //send_data_tago();  
    //delay(TEMPO_ENVIO_INFORMACOES);
    
/* Faz o envio da temperatura e umidade para o dashboard no node-red */
    //send_data_nodered();
    //delay(TEMPO_ENVIO_INFORMACOES);
  }
