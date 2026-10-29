import { CLIENT_IP_HEADER } from "@app/auth";
import type { NextFunction, Request, Response } from "express";

export function clientIpMiddleware(
	req: Request,
	_res: Response,
	next: NextFunction,
) {
	if (req.ip) req.headers[CLIENT_IP_HEADER] = req.ip;
	else delete req.headers[CLIENT_IP_HEADER];
	next();
}
