import Game from "./core/game.js";
const inputElement = document.getElementById("input-container")
const incorrectElement = document.getElementById("incorrect");
let game = new Game(inputElement);
const correctOtp = "111111";

function verifyOtp() {
  const otpInput = Array.from(document.querySelectorAll(".input-box"))
    .map((box) => box.textContent.trim())
    .join("");
    if (otpInput === correctOtp) {
        console.log("OTP verified!");
        game.correctOtpEntered();
        hideIncorrect();
    } else if (otpInput.length < correctOtp.length) {
        console.log("OTP incomplete.");
        game.wrongOtpEntered();
        sayIncorrect();
    } else {
        console.log("OTP incorrect.");
        game.wrongOtpEntered();
        sayIncorrect();
    }
    // game.correctOtpEntered();
}

function sayIncorrect() {
    incorrectElement.style.display = "block";
}

function hideIncorrect() {
    incorrectElement.style.display = "none";
}

document.getElementById("verify-button").addEventListener("click", verifyOtp);