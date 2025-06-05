import { Request, Response } from "express";
import { errorHandler, getCredentials, WebRTCConnector } from "../utils/index.js";

export const handleGetIceServers = async (req: Request, res: Response): Promise<Record<string, any> | void> => {

  try {
    const credentials = getCredentials(req.query);

    const webRTCConnector = await WebRTCConnector.create(credentials.urlSlug, { credentials } );


    await webRTCConnector.getTwilioConfig();

    return res.json(webRTCConnector?.twilioConfig);
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGetIceServers",
      message: "Error getting ice servers",
      req,
      res,
    });
  }
};
