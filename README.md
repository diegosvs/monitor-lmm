# monitor-lmm
Repositório do sistema de monitoramento de temperatura, umidade e pressão do Laboratório de Metrologia Mecânica - CTMetro IPT

No intuito de atender a ABNT NBR 17025, este projeto integrará conceitos de IoT para automação na aquisição de temperatura, umidade e pressão dos laboratórios da metrologia mecânica e disponibilizá-los ao controle de qualidade. 
O broker MQTT está hospedado na tago.io, e os dispositivos estimados serão cadastrados a partir desta plataforma.
A placa utilizada será o ESP8266 responsável pela interpretação dos dados dos sensores e conexão com a rede WiFi do local onde forem instalados.
O DashBoard de interação com a plataforma é desenvolvido em NODE-RED e hospedado na CloudIBM de maneira a facilitar o acesso por meio de uma URL.
O broker realizará cálculos de valores máximos e mínimos, alerta de valores fora do desejável e envio das medidas periódicas por e-mail. 
