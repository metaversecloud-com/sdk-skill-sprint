import SimplePeer from "simple-peer";
import type { Instance as PeerInstance } from "simple-peer";
import { backendAPI } from "./backendAPI";
import { setGameState, setErrorMessage } from "@/utils";

// context
import { ActionType, InteractiveParams, QuestionsMap, SET_GAME_STARTED, SET_WEB_RTC_CONNECTOR } from "@/context/types";
import { Dispatch } from "react";

export const getVisitor = (
  iceServers: [],
  interactiveParams: InteractiveParams,
  dispatch: Dispatch<ActionType> | null,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const { gameEngineId, visitorId } = interactiveParams;

      const peer: PeerInstance = new SimplePeer({
        initiator: true,
        trickle: false,
        streams: [],
        config: {
          iceServers,
        },
      });

      // put the peer instance in global context under visitor
      dispatch!({
        type: SET_WEB_RTC_CONNECTOR,
        payload: peer,
      });

      // When the engine produces an "offer" signal
      peer.on("signal", async (signal) => {
        try {
          const response = await backendAPI.put("signal", { signal });

          if (!response.data.success) {
            console.error("Unable to get answer signal");
            return;
          }

          const { answerSignal } = response.data;
          console.log("received answer:", answerSignal);

          peer.signal(answerSignal);
        } catch (error) {}
      });

      // if the engine sends data
      peer.on("data", (data) => {
        console.log("data: " + data);
        data = JSON.parse(data);

        // @TODO: fix questions not being the same second time around (purge old qdata?)
        if (data.payload.type === "start") {
          const questionsReceived: QuestionsMap = data.payload.payload.questions;
          console.log("questionsReceived" + questionsReceived);

          dispatch!({
            type: SET_GAME_STARTED,
            payload: {
              gameStarted: true,
              questions: questionsReceived,
            },
          });

          resolve();
          return;
        }

        const payload = {
          eventId: "fromIframe",
          gameEngineId: gameEngineId,
          payload: {
            type: "message",
            payload: { message: "howdy yall!" },
          },
        };
        peer.send(JSON.stringify(payload));
      });

      peer.on("connect", () => {
        console.log("connect");
        peer.send(
          JSON.stringify({
            eventId: "fromIframe",
            gameEngineId,
            payload: {
              type: "connected",
              playerId: visitorId,
              success: true,
            },
          }),
        );

        // backendAPI
        //     .get("/game-state", { params: { ...interactiveParams }, })
        //     .then((resp) => {
        //       setGameState(dispatch, resp.data);
        //     })
        //     .catch((err) => {
        //       setErrorMessage(dispatch, err);
        //     })
        //     .finally(() => {
        //       resolve();
        //     });
      });

      peer.on("error", (err) => {
        console.error("Peer error (before game-state):", err);
        setErrorMessage(dispatch, err);
        reject(err);
      });
    } catch (topErr) {
      console.error("getVisitor top‐level error:", topErr);
      reject(topErr);
    }
  });
};
