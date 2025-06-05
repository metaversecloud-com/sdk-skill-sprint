import type SimplePeer from "simple-peer";

export const SET_HAS_SETUP_BACKEND = "SET_HAS_SETUP_BACKEND";
export const SET_INTERACTIVE_PARAMS = "SET_INTERACTIVE_PARAMS";
export const SET_WEB_RTC_CONNECTOR = "SET_WEB_RTC_CONNECTOR";
export const SET_GAME_STATE = "SET_GAME_STATE";
export const SET_ERROR = "SET_ERROR";
export const SET_GAME_STARTED = "SET_GAME_STARTED";

export type InteractiveParams = {
  assetId: string;
  displayName: string;
  identityId: string;
  interactiveNonce: string;
  interactivePublicKey: string;
  profileId: string;
  sceneDropId: string;
  uniqueName: string;
  urlSlug: string;
  username: string;
  visitorId: string;
  gameEngineId?: string;
  iframeId?: string;
  hasDataChannel?: string;
};

export interface InitialState {
  isAdmin?: boolean;
  droppedAsset?: { assetName: string; bottomLayerURL: string; id: string; topLayerURL: string };
  error?: string;
  hasInteractiveParams?: boolean;
  hasSetupBackend?: boolean;
  profileId?: string;
  sceneDropId?: string;
  visitor?: SimplePeer.Instance | null;

  visitorId?: string;
  gameEngineId: string;

  gameStarted?: boolean;
  questions?: QuestionsMap;
}

export type ActionType = {
  type: string;
  payload: any;
};

export type Question = {
  questionNumber: number;
  text: string;
  options: string[];
  correctIndex: number;
};

export type QuestionsMap = Record<string, Question>;
