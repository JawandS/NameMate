// email
import { triggeredEmails } from 'wix-crm';
// copy 
import wixWindow from 'wix-window';
// Wix libraries
import { authentication } from 'wix-members';
import { currentMember } from 'wix-members';
// get history
import { getHistory } from 'backend/backend.jsw';

$w.onReady(function() {

	// get history
	if (!authentication.loggedIn()) {
        authentication.promptLogin();
    } else {
		currentMember.getMember({ fieldsets: ['FULL'] }).then((currentMember) => {
			const email = currentMember.loginEmail;
			getHistory(email).then(function(res) {
				// process results
				if (res.items.length > 0) { // user found
					let values = res.items;
					var history = [];
					var historyText = "";
					for (let i = 0; i < values.length; i++) {
						history.push({
						"result": values[i]["result"],
						"info": values[i]["info"],
						"prompt": values[i]["prompt"],
						"ts": values[i]["_updatedDate"],
						});
						var curr = history[i];
						historyText +=  `Date: ${curr["ts"]}\nPrompt: ${curr["prompt"]}\nInformation: ${curr["info"]}\nResult:${curr["result"]}\n\n`
					}
					// get most recent
					var currentReq = history[0];
					console.log(`current req ${currentReq['result']}`)
					$w("#promptText").text = `${currentReq["prompt"]}`;
					$w("#infoText").text = `${currentReq["info"]}`;
					$w("#resultText").text = `${currentReq["result"]}`;
					// display history text
					$w("#historyText").text = historyText;
				} else { // no user found
					$w("#historyText").text = "no history found!";
				}
			}).catch(err => {
				$w("#historyText").text = `Error! ${err}`;
			});
		});
	}

	//redo button fuctionality
	$w("#redoButton").onClick(function (event) { 
		
	});

	//email self fuctionality
	$w("#emailButton").onClick(function (event) { 
		if (!authentication.loggedIn) { // confirm log in
			authentication.promptLogin();
			return;
		}

		// send email to the user
		currentMember.getMember({ fieldsets: ['FULL'] }).then((member) => {
			console.log("Emailing user")
        	// get the user information
        	const email = member.loginEmail;
			var name = `${member.contactDetails.firstName} ${member.contactDetails.lastName}`;
			const memberID = member._id;
			if (name === "undefined undefined")
				name = "User";
			triggeredEmails.emailMember('TPNYkbV', memberID, {
				variables: {
					queryType: $w("#promptText").text,
					information: $w("#infoText").text,
					result: $w("#resultText").text,
					name: name
				}
			}).then(res => {
				console.log("Email sent")
				$w("#emailButton").label = "Sent!";
			}).catch(err => {
				console.log(`email error: ${err}`)
			})
		});
	});

	// copy to clipboard
	$w("#copyButton").onClick(even => {
		var textToCopy = `${$w("#resultText").text}\nfrom NameMate.us`;
		wixWindow.copyToClipboard(textToCopy)
		.then( () => { 
			// handle case where text was copied
			$w("#copyButton").label = "Copied!"
		} )
		.catch( (err) => {
			// handle case where an error occurred
			$w("#copyButton").label = err;
		} );
	});

});
