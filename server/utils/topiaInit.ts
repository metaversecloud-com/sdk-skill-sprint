import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import {
  Topia,
  AssetFactory,
  DroppedAssetFactory,
  UserFactory,
  VisitorFactory,
  WebRTCConnectorFactory,
  WorldFactory,
} from "@rtsdk/topia";

const config = {
  apiDomain: process.env.INSTANCE_DOMAIN || "api.topia.io",
  apiProtocol: process.env.INSTANCE_PROTOCOL || "https",
  interactiveKey: process.env.INTERACTIVE_KEY,
  interactiveSecret: process.env.INTERACTIVE_SECRET,
};

const myTopiaInstance = new Topia(config);

const Asset = new AssetFactory(myTopiaInstance);
const DroppedAsset = new DroppedAssetFactory(myTopiaInstance);
const User = new UserFactory(myTopiaInstance);
const Visitor = new VisitorFactory(myTopiaInstance);
const WebRTCConnector = new WebRTCConnectorFactory(myTopiaInstance);
const World = new WorldFactory(myTopiaInstance);

export { Asset, DroppedAsset, myTopiaInstance, User, Visitor, WebRTCConnector, World };