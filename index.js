var dotenv = require("dotenv");

var mqtt = require('mqtt');
var mqtt_options = {
	servers: [{
		host: 'piggy.local',
		port: 1883
	}],
	will: {
		topic: "/GSD/RIP",
		payload: "GSD backend lost connection",
		qos: 0,
		retain: 0
	}
};
var client = mqtt.connect('mqtt://piggy.local');

function intentCallback(topic, msg) {
	console.log("MESSAGE: "+msg)

	var body = JSON.parse(msg);

	var resp = {
		'sessionId': body.sessionId,
		'text': "Acknowledged. I heard: " + body.input + " as " + body.intent.intentName
	};

	client.publish('hermes/dialogueManager/continueSession',JSON.stringify(resp))
}





console.log("test")



client.on('connect',function () {
	console.log("CONNECTED & SUBSCRIBED SUCCESSFULLY")
	client.publish("hermes/dialogueManager/startSession", JSON.stringify({"init":{"type":"notification","text":"Buckle Up."}}))
	client.subscribe('hermes/intent/searchWeatherForecast');
});

client.on('error',function(err){
	console.log("ERROR: "+err);
})

client.on('message', intentCallback);