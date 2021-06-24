/*
 * Programa: código para ESP8266 com aplicação para aquisição de DHT22
 * Autor: Diego Silva Viana dos Santos
 * Laboratório de Metrologia Mecânica -IPT
 * 
 */
#include <stdio.h>
//#include <WiFi.h>      //ESP32
#include <ESP8266WiFi.h> //ESP8266
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include "FirebaseESP8266.h"



/* Definicoes gerais */
//#define TEMPO_ENVIO_INFORMACOES    5000 //ms

/* Definicoes do sensor de temperatura */
#define DHTPIN  4   /* GPIO que o pino 2 do sensor é conectado */

/* 
 * A biblioteca serve para os sensores DHT11, DHT22 e DHT21.
 * No nosso caso, usaremos o DHT22,para utilizar outros disponíveis, 
 * basta descomentar a linha correspondente.
*/
//#define DHTTYPE DHT11   // DHT 11
#define DHTTYPE DHT22   // DHT 22  (AM2302), AM2321
//#define DHTTYPE DHT21   // DHT 21 (AM2301)

/* Definicoes da UART de debug para NodeMCU v2, setar bauderate para 9600 */
#define DEBUG_UART_BAUDRATE               9600

/*
https://github.com/mobizt/Firebase-ESP8266
https://github.com/mobizt/Firebase-ESP-Client
https://github.com/mobizt/FirebaseJson
#define FIREBASE_HOST ""
#define FIREBASE_AUTH ""

FirebaseData firebaseData;

Firebase.begin(FIREBASE_HOST, FIREBASE_AUTH);
Firebse.reconnectWiFi(true);

Firebase.getString(firebaseData, [topico]);
Firebase.setString(firebaseData, [topico], [variavel]);
*/

/*tópico para publicação no node-red em broker local */
#define MQTT_PUB_STORE "tagodata/store" //topico de transmissão de dados para broker local

/*DEFINICOES DO DISPOSITIVO CADASTRADO NO BROKER*/
#define MQTT_USERNAME  "LMM-TU-002"  // nome do dispositivo cadastrado 
#define MQTT_PASSWORD  ""  // se houver senha cadastrada no broker

#define FIREBASE_HOST ""
#define FIREBASE_AUTH ""

/* WIFI */
const char *ssid_wifi = "IPT-WiFi-Novo";     /*  INSERIR O NOME DA REDE WIFI QUE O DISPOSITIVO SERÁ CONECTADO */
const char *password_wifi = "m@gnesium"; /*  SENHA DA REDE WIFI */

/*Configuração para IP fixo caso necessario*/
//IPAddress ip(192,168,0,175); //COLOQUE UMA FAIXA DE IP DISPONÍVEL DO SEU ROTEADOR. EX: 192.168.1.110 **** ISSO VARIA, NO MEU CASO É: 192.168.0.175
//IPAddress gateway(192,168,0,1); //GATEWAY DE CONEXÃO (ALTERE PARA O GATEWAY DO SEU ROTEADOR)
//IPAddress subnet(255,255,255,0);

WiFiClient espClient; 
FirebaseData firebaseData;


/* MQTT */
/* MQTT broker URL */
//const char* broker_mqtt = "mqtt.tago.io"; 

/* endereço do broker MQTT local e respectiva porta para o dispositivo */
const char* broker_mqtt = "200.18.107.56"; //inserir endereço do broker local
int broker_port = 1883;  // inserir a porta cadastrada no broker

PubSubClient MQTT(espClient); 

/*VARIAVEL GLOBAL PARA TESTE DO LED INTERNO DA PLACA*/
bool ledteste = false;
 
/* objeto para comunicação com sensor DHT22  */
DHT dht(DHTPIN, DHTTYPE);

/*objetos para utilizacao de threads, caso necessario*/
//ThreadController cpu;
//Thread threadFuncaoTago; //thread de envio de dados para tago.io
//Thread threadFuncaoDashboard; //thread de envio de dados para dashboard ibmcloud

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


/* Funcao: inicializa conexao wi-fi */
void init_wifi(void) 
{
    delay(10);
    Serial.println("------WI-FI -----");
    Serial.print("Tentando se conectar a rede wi-fi ");
    Serial.println(ssid_wifi);
    Serial.println("Aguardando conexao");    
    connect_wifi();
}

/* Funcao: conexao a uma rede wi-fi */
void connect_wifi(void) 
  {
    if (WiFi.status() == WL_CONNECTED)
        return;
        
    WiFi.disconnect();
    WiFi.begin(ssid_wifi, password_wifi);
    //WiFi.config(ip, gateway, subnet); //configuração para IP fixo
    
    while (WiFi.status() != WL_CONNECTED) 
      {
          //delay(100);
          //Serial.print(".");
          // rotina para led interno indicar falha de conexao com rede wifi
          digitalWrite(LED_BUILTIN, LOW);
          delay(100);
          digitalWrite(LED_BUILTIN, HIGH);
          delay(400);
      }
  
      Serial.println();
      Serial.print("Conectado a rede wi-fi: ");
      //Serial.println(ssid_wifi);
      Serial.println(WiFi.SSID());
      Serial.print("IP: ");
      Serial.println(WiFi.localIP());
      Serial.println(WiFi.gatewayIP());
      Serial.println(WiFi.subnetMask());
      Serial.println(WiFi.macAddress());
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
    Firebase.begin(FIREBASE_HOST, FIREBASE_AUTH);
}

/* Funcao: conecta com broker MQTT (se nao ha conexao ativa)*/
void connect_MQTT(void) 
{
    char mqtt_id_randomico[5] = {0}; 

    while (!MQTT.connected()) 
    {
        Serial.print("* Tentando se conectar ao broker MQTT: ");
        Serial.println(broker_mqtt);

        /* gera id mqtt randomico */
        randomSeed(random(9999));
        sprintf(mqtt_id_randomico, "%ld", random(9999));
        
        if (MQTT.connect(mqtt_id_randomico, MQTT_USERNAME, MQTT_PASSWORD)) 
        {
            //subscreve o dispositivo aos topicos para recepção de dados
            Serial.println("Conectado ao broker MQTT com sucesso!");
            MQTT.subscribe("LEDPLACA"); // topico de estado do led
            MQTT.subscribe("datatago"); // topico que grava os dados em arquivo local do broker
            MQTT.subscribe("datanode"); // topico para envio de dados para o dashboard 
        } 
        else 
        {
            //Serial.println("Falha na tentativa de conexao com broker MQTT.");
            //Serial.println("Nova tentativa em 2s...");
            // rotina do led interno para indicar falta de conexao com o broker
            digitalWrite(LED_BUILTIN, LOW);
            delay(1000);
            digitalWrite(LED_BUILTIN, HIGH);
            delay(1000);
        }
         
    }
}

/* Funcao: verifica e garante conexao MQTT  */
void verify_mqtt_connection(void)
  {
    connect_MQTT();  
  }

/* Funcao: checa os tópicos enviados para o esp8266 para interação com o broker */
 void callback(String topic, byte* payload, unsigned int length) 
  {

    String messageTemp; 
    
    for (int i = 0; i < length; i++) 
      {       
        messageTemp += (char)payload[i];
      }  
  
    //Serial.print(messageTemp);
    //Serial.println();
    //Serial.print(topic);
    //Serial.println();

  /*topico que checa se o botao de teste do dashboard do led interno foi pressionado*/
    if(topic=="LEDPLACA") 
        {  
          if(messageTemp == "ligar" )
            {
              ledteste=!ledteste;
              digitalWrite(LED_BUILTIN, ledteste);
            }
            
          else if(messageTemp == "desligar")
            {      
              //digitalWrite(LED_BUILTIN, HIGH);
            }
        }  
  
    /*recebe o topico que aciona a funcao de envio de valores para o broker para que sejam armazenados*/
    else if(topic=="datatago") 
        {  
          if(messageTemp == "send_data_tago" )
            {
              send_data_tago();
            }     
        }
  
    /*recebe o topico que aciona a funcao de envio de valores para o dashboard*/
    else if(topic=="datanode") 
        {  
          if(messageTemp == "send_data_node" )
            {
              send_data_nodered();            
            }     
        }       
  }

/*função para envio de dados ao broker e armazenamento*/
void send_data_tago(void) 
  {
   StaticJsonDocument<250> tago_json_temperature;
   StaticJsonDocument<250> tago_json_humidity;
   StaticJsonDocument<250> tago_json_store;
   char json_string[250] = {0};
   float temperatura_lida = dht.readTemperature();
   float umidade_lida = dht.readHumidity();
   int i;

   /* Imprime medicoes de temperatura e umidade (para debug) */
   for (i=0; i<10; i++)
       Serial.println(" ");
       
   Serial.println("----------");
   Serial.print("Temperatura: ");
   Serial.print(temperatura_lida);
   Serial.println("C");
   Serial.print("Umidade: ");
   Serial.print(umidade_lida);
   Serial.println("%");
   
   tago_json_store["device"] = MQTT_USERNAME; 
   tago_json_store["value_temperature"] = temperatura_lida;
   tago_json_store["value_humidity"] = umidade_lida;
     
   memset(json_string, 0, sizeof(json_string));
   serializeJson(tago_json_store, json_string);
   MQTT.publish(MQTT_PUB_STORE, json_string);  
   
  }
  
/* Funcao: envia os valores para o dashboard node-red*/
void send_data_nodered(void)
  {
   float temperatura_lida = dht.readTemperature();
   float umidade_lida = dht.readHumidity();

   MQTT.publish("device/temperatura", String(temperatura_lida).c_str(), true);
   MQTT.publish("device/umidade", String(umidade_lida).c_str(), true);
  }

void setup() 
  {     
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
    
    /*thread para fução de envio ao broker tagoIO*/
    //threadFuncaoTago.setInterval(600000);
    //threadFuncaoTago.onRun(send_data_tago);

    /*thread para envio de informações ao dashboard em node-red*/
    //threadFuncaoDashboard.setInterval(5000);
    //threadFuncaoDashboard.onRun(send_data_nodered);

    /*Adiciona cada funcao das threads ao objeto cpu para que sejam executadas de acordo com o intervalo estabelecido*/
    //cpu.add(&threadFuncaoTago);
    //cpu.add(&threadFuncaoDashboard);
  }

void loop() 
  {
    /* Verifica e garante conectividades wi-fi e MQTT */
    verify_wifi_connection(); // checa o status da conexão wifi
    verify_mqtt_connection(); // checa o status da conexão com o broker

    /*começa a rodar as threads declaradas*/
    //cpu.run();

    /*checa se alguma mensagem chegou via publish*/ 
    MQTT.loop();
    
    /* Faz o envio da temperatura e umidade para a plataforma IoT (Tago.io) */   
    //send_data_tago();  
    //delay(TEMPO_ENVIO_INFORMACOES);
    
    /* Faz o envio da temperatura e umidade para o dashboard no node-red */
    //send_data_nodered();
    //delay(TEMPO_ENVIO_INFORMACOES);
  }
