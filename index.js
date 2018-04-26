var dotenv = require("dotenv");

var mqtt = require('mqtt');
var mqtt_options = {
	servers: [{
		host: 'localhost',
		port: 1883
	}],
	will: {
		topic: "/snips/XFP/RIP",
		payload: "XFP backend lost connection",
		qos: 0,
		retain: 0
	}
};
var client = mqtt.connect(mqtt_options);

function endDialogue(sessionId,text){
	var resp = {
		'sessionId': sessionId,
		'text': text
	};
	client.publish('hermes/dialogueManager/endSession',JSON.stringify(resp));
}
function continueDialogue(sessionId,text,intentFilter){
	var resp = {
		'sessionId': sessionId,
		'text': text,
		'intentFilter': intentFilter
	};
	client.publish('hermes/dialogueManager/continueSession',JSON.stringify(resp));
}



var userStates = {
	paused: 	-1,
	done: 		0,
	Executing: 	1,
	Triaging: 	2,
	Inboxing: 	3,
	Clarifying: 4
}
var userState = userStates.done;

function intentCallback(topic, msg) {
	// console.log("MESSAGE: "+msg)

	var body = JSON.parse(msg);
	var intentName = body.intent.intentName;
	intentName = intentName.slice(intentName.lastIndexOf(':')+1);
	var intent = body.intent;
	var sessionId = body.sessionId;

	console.log("State: "+userState+" Intent: "+intentName);

	switch (userState){
		case userStates.done: 	
		//Day is done or has not started yet
			switch(intentName) {
				case "haniawni:startTriaging":
				//Time to Triage!
					//TODO(someday): check abt deleting CTL beforehand
					//TODO: save old CTL
					//TODO: clear current CTL
					userState = userStates.Triaging;

					continueDialogue(sessionId,
						"What do you need to do today?",
						['haniawni:triageAppend', 'haniawni:triageStatus', 'haniawni:triageDone'] //TODO: add 'do this later'??
						);
					break;
				default:
				// inappropriate relaxing-state input
					continueDialogue(sessionId,
						"Inappropriate Intent: " + intentName + ". Currently " + "relaxing" + ".",
						['haniawni:startTriaging']);
			}
		break;


		case userStates.Triaging:
		// Currently triaging tasks from MTL to CTL
			switch(intentName){
				case 'haniawni:triageStatus':
				// Requesting current CTL
					// TODO: fetch entire CTL from DB
					// TODO: squish down tasks & concatenate
					continueDialogue(sessionId,
						"Please pretend I read off your CTL here.", // TODO: actual value
						['haniawni:triageAppend', 'haniawni:triageStatus', 'haniawni:triageDone']);
					break;
				case 'haniawni:triageAppend':
				//slot contains new task
					//TODO: insert task into CTL in DB
					continueDialogue(sessionId,
						"Good, then what?",
						['haniawni:triageAppend', 'haniawni:triageStatus', 'haniawni:triageDone']);
					break;
				case 'triageDone':
				//triaging complete; proceed to Execution
					userState = userStates.Execution;
					//TODO: fetch current task from DB
					endDialogue(sessionId,
						"Triaging Complete: Current task: stay alive. Godspeed." //switch to first task
						);
					break;
				default:
				// inappropriate triaging-state input
					continueDialogue(sessionId,
						"What? I heard "+intentName+", but we're currently triaging.",
						['haniawni:triageAppend', 'haniawni:triageStatus', 'haniawni:triageDone']);
			}
		break;

		default:
		// not yet implemented user state
			endDialogue(sessionId,
				"User state " + userState + " not yet implemented. Switching to 'done'.");
			userState = userStates.done;
	}
}






client.on('connect',function () {
	console.log("CONNECTED & SUBSCRIBED SUCCESSFULLY")
	client.publish("hermes/dialogueManager/startSession", JSON.stringify({"init":{"type":"notification","text":"JARVIS ONLINE."}}))
	client.subscribe([
		'hermes/intent/haniawni:startTriaging',
		'hermes/intent/haniawni:triageAppend',
		'hermes/intent/haniawni:triageDone',
		'hermes/intent/haniawni:triageStatus'
		]);
});

client.on('error',function(err){
	console.log("ERROR: "+err);
})

client.on('message', intentCallback);