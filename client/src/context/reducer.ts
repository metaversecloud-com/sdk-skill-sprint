import type SimplePeer from "simple-peer";

import {
  ActionType,
  InitialState,
  SET_HAS_SETUP_BACKEND,
  SET_INTERACTIVE_PARAMS,
  SET_WEB_RTC_CONNECTOR,
  SET_GAME_STATE,
  SET_ERROR,
  SET_GAME_STARTED,
} from "./types";

const globalReducer = (state: InitialState, action: ActionType) => {
  const { type, payload } = action;
  switch (type) {
    case SET_INTERACTIVE_PARAMS:
      return {
        ...state,
        ...payload,
        hasInteractiveParams: true,
      };
    case SET_HAS_SETUP_BACKEND:
      return {
        ...state,
        ...payload,
        hasSetupBackend: true,
      };
    case SET_WEB_RTC_CONNECTOR:
      return {
        ...state,
        visitor: payload as SimplePeer.Instance,
      };
    case SET_GAME_STATE:
      return {
        ...state,
        droppedAsset: payload.droppedAsset,
        visitor: payload.visitor,
        error: "",
      };
    case SET_ERROR:
      return {
        ...state,
        error: payload?.error,
      };
    case SET_GAME_STARTED:
      return {
        ...state,
        gameStarted: payload.gameStarted,
        questions: payload.questions,
      };

    default: {
      throw new Error(`Unhandled action type: ${type}`);
    }
  }
};

export { globalReducer };
