import {
	IRequestEngine,
	Request,
	Response,
} from './types'

import {
	Header
} from './classes'

import axios, { AxiosRequestConfig } from 'axios'


abstract class RequestEngine implements IRequestEngine {
	constructor() {
	
	}
	public abstract request(req :Request) :Promise<Response>
}

export class AxiosWrapper extends RequestEngine {
	constructor() {
		super()
	}
	async request(req: Request) :Promise<Response> {
		const axiosRequest: AxiosRequestConfig = {
			method: req.method,
			baseURL: req.host,
			url: req.path,
			data: req.payload,
			params: req.query.toJSON(),
			headers: req.headers.toJSON()
		}
		const result = await axios(axiosRequest)
		return {
			code: result.status,
			reply: result.data,
			headers: new Header(result.headers),
		}
	}
}
