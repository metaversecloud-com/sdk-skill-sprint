import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor } from "../utils/index.js";

export const handleSendSignal = async (req: Request, res: Response): Promise<Record<string, any> | void> => {
  try {
    const credentials = getCredentials(req.query);
    const { visitorId, urlSlug } = credentials;

    const visitor = await Visitor.create(visitorId, urlSlug, { credentials });
    const response = await visitor.sendSignalToVisitor(req.body.signal);

    if (!response || !response.success) {
      return res.json({ success: false });
    }

    const { answerSignal } = response;

    return res.json({ success: true, answerSignal });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGetTwilioConfig",
      message: "Error setting up WebRTCConnector",
      req,
      res,
    });
  }
};