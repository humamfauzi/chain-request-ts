import { 
	RequestMethod,
	RequestReport,
	Request,
	StatusCode,
	Response,

	IAssertion,
  IFormation,
	IRequestEngine
} from './types'

import {
	AxiosWrapper
} from './backend'

import { assert } from 'chai'
import { v4 as uuidv4 } from 'uuid'

// TODO: Create a check whether there is a cicular request

export class RequestClass {
	method: RequestMethod
	host: string
	path: string

	payloads: object[]
	query: IFormation
	headers: IFormation

	assertions: IAssertion[]

	prevRequests: RequestClass[]
	nextRequests: RequestClass[]

	isCompleted: boolean
	requestReport: RequestReport
	
	readonly requestBackend: IRequestEngine
	readonly requestId: string

	constructor(request :Request) {
	
		this.method = request.method
		this.host = request.host
		this.path = request.path
		this.query = request.query
		this.headers = request.headers
		this.payloads = [ request.payload ]

		this.nextRequests = []
		this.prevRequests = []

		this.isCompleted = false
		this.requestId = this.generateRequestId()

		this.requestBackend = new AxiosWrapper()
	}

	public addAssertion<T>(assertion :Assertion<T>) {
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
			assertion.compareValueFromResult(result)
		}
		this.requestReport = this.generateRequestReport(result)	
	}
		
	private generateRequestReport(result :Response) :RequestReport {
		const requestReport: RequestReport = {
			success: false,
			time: new Date(),
			request_id: this.getRequestId(),
			request: this.getRequest(),
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

export class Assertion<T> implements IAssertion {
	referenceValue: T
	finderFunction: (result: any) => T
	comparison: string
	isBreaking: boolean
	isWarning: boolean
	report: string

	constructor(isBreaking: boolean) {
		this.isBreaking = isBreaking	
		this.report = "empty"
	}

	public setReferenceValue(referenceValue: T) :void {
		this.referenceValue = referenceValue
	}

	public setWarningLog(isWarning: boolean) :void {
		this.isWarning = isWarning
	}
	public setComparison(comparison: string) :void {
		this.comparison = comparison
	}

	public setFinderFunction(fn: (result: any) => T) {
		this.finderFunction = fn	
	}
	public compareValueFromResult(result: any) {
		const actualValue = this.finderFunction(result)
		return this.compare(actualValue)
	}

	@Assertion.catchDecorator
	public compare(actualValue: T) :void {
		this.report = `${actualValue} ${this.comparison} ${this.referenceValue}`
		assert[this.comparison](actualValue, this.referenceValue)
	}

	@Assertion.catchDecorator
	public directCompare(actualValue: T, comparison: string, refValue: T) :void {
		this.report = `${actualValue} ${comparison} ${refValue}`
		assert[comparison](actualValue, refValue)
	}
	public getReport() :string {
		return this.report
	}

	private static catchDecorator(target: any, propertyKey: string, descriptor: any) {
		const original = descriptor.value
		descriptor.value = function( ... args: any[]) {
			try {
				const result = original.apply(this, args)
			} catch(e) {
				if (this.isBreaking) {
					throw new Error(e)
				}	else if (this.isWarning) {
					console.log("Assertion fail", this.report)		
				}
			}
		}
	}
}

export abstract class Formation implements IFormation {
	objectForm: object
	stringForm: string

	constructor(baseFormation :string | object) {
		this.initFormation(baseFormation)
	}

	private initFormation(baseFormation :string | object) {
		switch (typeof baseFormation) {
			case 'string':
				return this.initStringBased(baseFormation)
			case 'object':
				return this.initObjectBased(baseFormation)
			default:
				throw new Error("Cannot init Formation")
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
	queryString :URLSearchParams
	constructor(base :string | object) {
		super(base)
	}
	protected convertToObject(baseFormation :string) :object {
		const qs = new URLSearchParams(baseFormation)	
		const newObject = {}
		for (const [key, value] of qs) {
			newObject[key] = value
		}
		return newObject
	}
	protected convertToString(baseFormation: object) :string {
		const newObj :Record<string, string> = {}
		for (const [key, value] of Object.entries(baseFormation)) {
			newObj['' + key] = '' + value
		}
		const qs = new URLSearchParams(newObj)
		return qs.toString()
	}
	public toJSON() :object {
		return this.objectForm
	}
                          
	public toString() :string{
		return this.stringForm	
	}

	public listKeys() :string[]{
		return Object.keys(this.objectForm)	
	}
}

export class Header extends Formation {
	constructor(base :string | object) {
		super(base)
	}

	protected convertToObject(baseQuery :string) :object {
		const splitted = baseQuery.split("\n")
		const newObject = {}
		for (const s of splitted) {
			if (s.includes(": ")) {
				const [key, value] = s.split(": ")	
				newObject[key] = value.trim()
			}
		}
		return newObject
	}
	
	protected convertToString(baseFormation: object) :string {
		let finalString :string = ''
		for(const [key, value] of Object.entries(baseFormation)) {
			finalString += `${key}: ${value}\n`	
		}
		return finalString.slice(0, finalString.length -1)
	}

	public toJSON() :object {
		return this.objectForm
	}
                          
	public toString() :string{
		return this.stringForm	
	}

	public listKeys() :string[]{
		return Object.keys(this.objectForm)	
	}
}
