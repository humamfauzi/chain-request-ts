import { 
  IFormation,
	RequestMethod,
	RequestReport,
	Request,
	StatusCode,
	Response
} from './types'

import * as axios from 'axios'
import { v4 as uuidv4 } from 'uuid'

// TODO: Create a check whether there is a cicular request

export class RequestClass {
	readonly requestId: string
	method: RequestMethod
	host: string
	path: string

	payloads: object[]
	query: IFormation
	headers: IFormation

	assertions: Assertion[]

	prevRequests: RequestClass[]
	nextRequests: RequestClass[]

	isCompleted: boolean
	requestReport: RequestReport

	constructor(request :Request) {
	
		this.method = request.method
		this.host = request.host
		this.path = request.path
		this.query = request.query
		this.headers = request.headers

		this.nextRequests = []
		this.prevRequests = []

		this.isCompleted = false
		this.requestId = this.generateRequestId()
	}

	public addAssertion(assertion :Assertion) {
		this.assertions.push(assertion)	
	}

	public setNextRequest(request :RequestClass) {
		this.nextRequests.push(request)
		request.setPreviousRequest(this)
	}

	public setPreviousRequest(request :RequestClass) {
		this.prevRequests.push(request)
	}

	public addPayload(payload :object) {
		this.payloads.push(payload)
	}

	public async runRequestAndAssertions() {
		const result = this.runRequest()
		this.runAssertions(result)
		const { code, reply } = result
		for (const nextRequest of this.nextRequests) {
			nextRequest.addPayload(reply)
			if (nextRequest.isAllPreviousRequestDone()) {
				await nextRequest.runRequestAndAssertions()
			}
		}
		return
	}

	public isAllPreviousRequestDone() :boolean {
		for (const prevRequest of this.prevRequests) {
			if (!prevRequest.isComplete()) {
				return false
			}
		}	
		return true
	}

	public getRequest() :Request {
		return {
			method: this.method,
			host: this.host, 
			path: this.path,
			payload: this.payloads,
			query: this.query,
			headers: this.headers,
		}	
	}
	public getRequestId() :string {
		return this.requestId	
	}

	public getPreviousRequestId() :string[] {
		return this.prevRequests.map(pr => {
			return pr.getRequestId()
		})
	}

	public getNextRequestId() :string[] {
		return this.nextRequests.map(nr => {
			return nr.getRequestId()
		})
	}

	private generateRequestId() :string {
		return uuidv4()
	}

	private isComplete() :boolean {
		return this.isCompleted	
	}

	private completeRequest() :void {
		this.isCompleted = true	
	}

	private runRequest() :Response {
		return {
			code: StatusCode.OK,
			reply: {}	
		}	
	}

	private runAssertions(result :Response) {
		this.completeRequest()
		for (const assertion of this.assertions) {
	
		}
		this.requestReport = this.generateRequestReport(result)	
	}

		
	private generateRequestReport(result :Response) :RequestReport {
		const request = this.getRequest()
		const requestReport: RequestReport = {
			success: false,
			time: new Date(),
			request_id: this.getRequestId(),
			request,
			response: result,
			previous_request_id: this.prevRequests.map(pr => {
				return pr.getRequestId()	
			}),
			next_request_id: this.nextRequests.map(nr => {
				return nr.getRequestId()
			})
		}
		return requestReport
	}
}

export class Assertion {
	referenceValue: any
	checkValuePath: string
	comparison: string
	constructor() {}
}

export abstract class Formation implements IFormation {
	objectForm: object
	stringForm: string

	constructor(baseQuery :string | object) {
		this.initQueryString(baseQuery)
	}

	private initQueryString(baseQuery :string | object) {
		switch (typeof baseQuery) {
			case 'string':
				return this.initStringBased(baseQuery)
			case 'object':
				return this.initObjectBased(baseQuery)
			default:
				throw new Error("Cannot init Query String")
		}
	}

	protected abstract convertToObject(baseQuery :string) :object

	protected abstract convertToString(baseQuery :object) :string

	private initStringBased(baseQuery: string) :void {
		this.stringForm = baseQuery
		this.objectForm = this.convertToObject(baseQuery)	
	}

	private initObjectBased(baseQuery: object) :void {
		this.objectForm = baseQuery
		this.stringForm = this.convertToString(baseQuery)	
	}

	public abstract toJSON() :object 
        
	public abstract toString() :string
        
	public abstract listKeys() :string[]
}

export class QueryString extends Formation {
	constructor(base :string | object) {
		super(base)
	}

	protected convertToObject(baseQuery :string) :object {
		return {}
	}
	
	protected convertToString(baseQuery: object) :string {
		return ''
	}

	public toJSON() :object {
		return {}	
	}
                          
	public toString() :string{
		return ''	
	}

                          
	public listKeys() :string[]{
		return ['']	
	}
}

export class Header extends Formation {
	constructor(base :string | object) {
		super(base)
	}

	protected convertToObject(baseQuery :string) :object {
		return {}
	}
	
	protected convertToString(baseQuery: object) :string {
		return ''
	}

	public toJSON() :object {
		return {}	
	}
                          
	public toString() :string{
		return ''	
	}

	public listKeys() :string[]{
		return ['']	
	}
}
