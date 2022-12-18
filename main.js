// Velo API Reference: https://www.wix.com/velo/reference/api-overview/introduction

// backend functions
import { namesReq } from 'backend/backend.jsw';
import { addNewUser } from 'backend/backend.jsw';
import { updateStandardRun } from 'backend/backend.jsw';
import { queryUserAuthen } from 'backend/backend.jsw';
import { updateReqs } from 'backend/backend.jsw';
// Wix libraries
import { authentication } from 'wix-members';
import { currentMember } from 'wix-members';
import wixData from 'wix-data';
import wixLocation from 'wix-location';

// starting req
let startingNormalQ = 5;
let startingSpecialQ = 0;



// ready for request
let ready = true;

async function nameGen() {
    console.log("button clicked");

    // checks for valid input and authentication
    if (!authentication.loggedIn()) {
        $w("#errMsg").show();
        $w("#errMsg").text = "Please log in!";
        authentication.promptLogin();
		ready = true
        return;
    }
    if ($w("#nameDropdown").value === "" || $w("#nameDropdown").value === "What do you want to generate?") {
        $w("#errMsg").show();
        $w("#errMsg").text = "Please select question!";
		ready = true
        return
    }
    if ($w("#nameInput").value === "" || $w("#nameInput").value === "Informaton: business summary | group/project details | interests") {
        $w("#errMsg").show();
        $w("#errMsg").text = "Please add information!";
		ready = true
        return;
    }

	// hide email self button
	// $w("#emailSelfButton").hide();
	// $w("#emailSelfButton").label = "Email Self";
	// $w("#tweetButton").hide();
	// $w("#tweetButton").label = "Tweet";
	

    currentMember.getMember({ fieldsets: ['FULL'] }).then((member) => {
        // get the user id and email
        const userID = member._id;
        const email = member.loginEmail;
        const fullName = `${member.contactDetails.firstName} ${member.contactDetails.lastName}`;
        // display loading text
        $w("#loadingIcon").show();
        $w("#loadingIcon").expand();
		// get the query and input value
		var specialReq = false;
        var questionValue = $w("#nameDropdown").value;
		var inputValue = $w("#nameInput").value;
        // check that the user is allowed to generate a query
		wixData.query("userAuthen").eq("userID", userID).find().then(function(res){
			let systemUserID = -1;
			if (res.items.length > 0) { // user found
				// get user data
				var authenUser = res.items[0];
				console.log(`User found: ${Object.values(authenUser.email)}`)
				var remSpecialUses = Number(authenUser.specialUses);
				var remNormalUses = Number(authenUser.normalUses);
				systemUserID = authenUser._id;
				
				if (specialReq && remSpecialUses <= 0) { // not enough special requests
					$w("#errMsg").show();
					$w("#errMsg").text = "Please purchase additional special questions!"; 
					// hide loading
					$w("#loadingIcon").hide();
					$w("#loadingIcon").collapse();
					return;
				} else if (!specialReq && remNormalUses <= 0) { // not enough normal requests
					$w("#errMsg").show();
					$w("#errMsg").text = "Please purchase additional questions!";
					// hide loading
					$w("#loadingIcon").hide();
					$w("#loadingIcon").collapse();
					return;
				}
			} else { // no user found, create new user with some base uses
				var remSpecialUses = startingSpecialQ;
				var remNormalUses = startingNormalQ;
				addNewUser(userID, startingNormalQ, startingSpecialQ, fullName, email).then(function(newUser) {
					systemUserID = newUser._id;
				});
				// $w("#nameOutput").text = "Welcome new user!"; 
			}
			// send the question and input to backend for processing
			namesReq(questionValue, inputValue).then(function (response) {
				// hide loading
				$w("#loadingIcon").hide();
				$w("#loadingIcon").collapse();
				// add query to database - email, name, prompt, user input, result
				updateReqs(email, fullName, $w("#nameDropdown").value, $w("#nameInput").value, response);
				// display the resulting value
				$w("#nameOutput").text = response;
				$w("#nameOutput").show();
				// $w("#emailSelfButton").show();
				// $w("#tweetButton").show();
				// indicate end of names request
				console.log("completed name req");
				// remove one use from userAuthen and display remaining questions
				if (specialReq) { // special request
					$w("#remUses").show();
					$w("#remUses").text = `${remNormalUses} Remaining Uses | ${remSpecialUses - 1} Special`
					updateStandardRun(systemUserID, remNormalUses + 1, remSpecialUses - 1, fullName, userID, email).then(function(res){});
				} else { // normal request
					$w("#remUses").show();
					$w("#remUses").text = `${remNormalUses - 1} Remaining Uses`
					updateStandardRun(systemUserID, remNormalUses, remSpecialUses, fullName, userID, email).then(function(res){});	
				}
				// return ready for another
				ready = true;
				// change page
				wixLocation.to('/namemate-results');
			}).catch(function (err) {
				// hide loading
				$w("#loadingIcon").hide();
				$w("#loadingIcon").collapse();
				// inform user
				$w("#errMsg").show();
				$w("#errMsg").text = "The server had an error with name generation. Please contact us.";
				console.error(`names request error ${err}`);
				ready = true;
			});
		});
    }).catch((error) => {
		// hide loading
		$w("#loadingIcon").hide();
		$w("#loadingIcon").collapse();
		// inform user
		$w("#errMsg").show();
		$w("#errMsg").text = "The server had an error regarding member data. Please contact us.";
        console.error(`member data error ${error}`);
		ready = true;
    });
}

$w.onReady(function () {
    console.log("loaded home page");
	displayRemaining();

	// generate cotent on enter or button press if request not in process
    $w("#nameButton").onClick((event) => {
		// reset
		$w("#errMsg").hide();
		// check if ready
		if (ready) {
			ready = false;
			nameGen();
		} else {
			console.log("Request already in progress")
			$w("#errMsg").text = "Please wait for previous request to complete!";
			$w("#errMsg").show();
		}
    });

	// hanlders for name input
	const maxLength = 500;
    $w("#nameInput").onKeyPress((event) => {
        if (event.key === "Enter" && ready) {
			ready = false;
			nameGen();
			ready = true;
		} else if (event.key === "Enter" && !ready) {
			$w("#errMsg").text = "Please wait for previous request to complete!";
			$w("#errMsg").show();
		} else {
			$w("#remChars").text = `${$w("#nameInput").value.length} / ${maxLength}`;
		}
    });

	// send tweet fuctionality
	// $w("#tweetButton").onClick(function (event) {
		// var link = `https://twitter.com/intent/tweet?text=Check%20out%20this%20post%20from%20NameMate.us%3A%0AQuestion%3A%20!%0AResult%0A${$w("#nameOutput").text}`
		// $w("#tweetButton").label = "Sent!";
	// });
});

function displayRemaining() {
	// update the remaining requests
	currentMember.getMember({ fieldsets: ['FULL'] }).then((currentMember) => {
		const userID = currentMember._id;
		queryUserAuthen(userID).then(function(res){
			if (res.items.length > 0) { // user found
				var authenUser = res.items[0];
				$w("#remUses").text = `${authenUser.normalUses} Remaining Uses`;
				$w("#remUses").show();
			}
		});
	});
}
