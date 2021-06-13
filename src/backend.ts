import {
	IRequestEngine
} from './types'
import * as axios from 'axios'


abstract class RequestEngine implements IRequestEngine {
	constructor() {
	
	}
	public abstract request() :Promise<void>
}

export class AxiosWrapper extends RequestEngine {
	constructor() {
		super()
	}
	async request() :Promise<void> {
		return
	}
}
