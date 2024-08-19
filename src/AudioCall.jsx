import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const AudioCall = () => {
  const socketRef = useRef();
  const localStreamRef = useRef();
  const remoteStreamRef = useRef();
  const peerConnectionRef = useRef();
  const [isCallStarted, setIsCallStarted] = useState(false);
  const [isReceivingCall, setIsReceivingCall] = useState(false);

  useEffect(() => {
    // Initialize Socket.IO
    socketRef.current = io.connect("http://localhost:2000");

    // Get audio stream
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      localStreamRef.current.srcObject = stream;

      // Initialize PeerConnection
      const peerConnection = new RTCPeerConnection();
      peerConnectionRef.current = peerConnection;

      // Add local stream to peer connection
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      // Handle incoming ice candidates
      socketRef.current.on("ice-candidate", (candidate) => {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      });

      // Handle offer
      socketRef.current.on("offer", async (offer) => {
        peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        setIsReceivingCall(true); // Show the pick call button
      });

      // Handle answer
      socketRef.current.on("answer", (answer) => {
        peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      });

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        remoteStreamRef.current.srcObject = event.streams[0];
      };

      // Handle ice candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit("ice-candidate", event.candidate);
        }
      };

      // Handle call hang up
      socketRef.current.on("hang-up", () => {
        endCall();
        alert("The other party has hung up the call.");
      });
    });

    // Cleanup on unmount
    return () => {
      endCall();
      socketRef.current.disconnect();
    };
  }, []);

  const createOffer = async () => {
    const offer = await peerConnectionRef.current.createOffer();
    await peerConnectionRef.current.setLocalDescription(offer);
    socketRef.current.emit("offer", offer);
    setIsCallStarted(true);
  };

  const answerCall = async () => {
    const peerConnection = peerConnectionRef.current;
    const offer = peerConnection.remoteDescription;
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socketRef.current.emit("answer", answer);
    setIsReceivingCall(false);
    setIsCallStarted(true);
  };

  const endCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current && localStreamRef.current.srcObject) {
      localStreamRef.current.srcObject
        .getTracks()
        .forEach((track) => track.stop());
      localStreamRef.current.srcObject = null;
    }
    if (remoteStreamRef.current && remoteStreamRef.current.srcObject) {
      remoteStreamRef.current.srcObject
        .getTracks()
        .forEach((track) => track.stop());
      remoteStreamRef.current.srcObject = null;
    }
    setIsCallStarted(false);
    setIsReceivingCall(false);
  };

  const handleHangUp = () => {
    endCall();
    socketRef.current.emit("hang-up");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Audio Call App</h1>
      <div className="flex space-x-4">
        {!isCallStarted && !isReceivingCall && (
          <button
            onClick={createOffer}
            className="bg-blue-500 text-white px-4 py-2 rounded-md shadow-md hover:bg-blue-700"
          >
            Start Call
          </button>
        )}
        {isReceivingCall && (
          <button
            onClick={answerCall}
            className="bg-green-500 text-white px-4 py-2 rounded-md shadow-md hover:bg-green-700"
          >
            Pick Call
          </button>
        )}
        {isCallStarted && (
          <button
            onClick={handleHangUp}
            className="bg-red-500 text-white px-4 py-2 rounded-md shadow-md hover:bg-red-700"
          >
            Hang Up
          </button>
        )}
      </div>
      <div className="mt-8">
        <audio ref={localStreamRef} autoPlay muted className="hidden" />
        <audio ref={remoteStreamRef} autoPlay className="hidden" />
      </div>
    </div>
  );
};

export default AudioCall;
