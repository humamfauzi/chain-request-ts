import { 
	RequestMethod,
	RequestReport,
	Request,
	StatusCode,
	Response,

	IAssertion,
  IFormation,
	IRequestEngine,
	ICircularCheck,
	ISequence,
	AssertionLevel,
	AssertionReport,
} from './types'

import {
	AxiosWrapper
} from './backend'

import { assert } from 'chai'
import { v4 as uuidv4 } from 'uuid'

// TODO: Create a check whether there is a cicular request
export class CircularCheck implements ICircularCheck {
	start: ISequence
	checked: string[]
	constructor(startingPoint :ISequence) {
		this.start = startingPoint	
		this.checked = []
	}

	public check() :boolean {
		return this.recursiveCheck(this.start)
	}

	private recursiveCheck(point :ISequence) :boolean {
		const nextSequences = point.getNext()
		if (nextSequences.length == 0) {
			return false	
		}
		const nextSequenceIds = nextSequences.map(ns => {
			return ns.getId()	
		})

		if (this.isAlreadyExist(nextSequenceIds)) {
			return true	
		}
		this.checked.push(...nextSequenceIds)
		return this.someTrue(nextSequences.map(ns => this.recursiveCheck(ns)))
	}

	private someTrue(boolArr :boolean[]) :boolean {
		return boolArr.includes(true)	
	}

	private isAlreadyExist(nextSequenceIds :string[]) :boolean {
		for (const nsi of nextSequenceIds) {
			if (this.checked.includes(nsi)) {
				return true
			}
		}
		return false
	}
}

export class RequestClass implements ISequence {
	method: RequestMethod
	host: string
	path: string

	payloads: object[]
	query: IFormation
	headers: IFormation

	assertions: IAssertion[]
	payloadFunction: (obj: any[]) => any

	prevRequests: RequestClass[]
	nextRequests: RequestClass[]

	isCompleted: boolean
	requestReport: RequestReport
	
	readonly requestBackend: IRequestEngine
	readonly requestId: string
	readonly circularChecker: ICircularCheck

	constructor(request :Request) {
	
		this.method = request.method
		this.host = request.host
		this.path = request.path
		this.query = request.query
		this.headers = request.headers
		this.payloads = [ request.payload ]

		this.nextRequests = []
		this.prevRequests = []

		this.assertions = []

		this.payloadFunction = function(obj: any[]) {
			return obj[0]
		}

		this.isCompleted = false
		this.requestId = this.generateRequestId()

		this.requestBackend = new AxiosWrapper()
		this.circularChecker = new CircularCheck(this)
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

	public setPayloadFunction(fn: (obj :any[]) => any) {
		this.payloadFunction = fn
	}

	public checkCircularRequest() :boolean {
		return this.circularChecker.check()
	}

	public async runRequestAndAssertions() {
		this.setPayloadUsingFunction()
		const result = await this.runRequest(this.getRequest())
		this.requestReport = this.runAssertions(result)
		const { reply } = result
		return this.runNextRequests(reply, this.requestReport)
	}

	public isAllPreviousRequestDone() :boolean {
		for (const prevRequest of this.prevRequests) {
			if (!(prevRequest.isComplete() && prevRequest.isOK())) {
				return false
			}
		}	
		return true
	}

	public isOK() :boolean {
		return this.requestReport.success
	}

	public getRequest() :Request {
		return {
			method: this.method,
			host: this.host, 
			path: this.path,
			payload: this.payloads[0],
			query: this.query,
			headers: this.headers,
		}	
	}

	public getReport() :RequestReport {
		return this.requestReport
	}
	
	public getId() :string {
		return this.requestId	
	}

	public getPrevious() :RequestClass[] {
		return this.prevRequests
	}

	public getNext() :RequestClass[] {
		return this.nextRequests
	}

	public isComplete() :boolean {
		return this.isCompleted	
	}

	private setPayloadUsingFunction() {
		this.payloads = [ this.payloadFunction(this.payloads) ]
	}

	private generateRequestId() :string {
		return uuidv4()
	}

	private completeRequest() :void {
		this.isCompleted = true	
	}

	private async runRequest(req :Request) :Promise<Response> {
		return this.requestBackend.request(req)
	}

	private runAssertions(result :Response) :RequestReport {
		this.completeRequest()
		const assertionReports = []
		for (const assertion of this.assertions) {
			assertionReports.push(assertion.compareValueFromResult(result))
		}
		return this.generateRequestReport(result, assertionReports)
	}

	private runNextRequests(res: Response, reqReport :RequestReport) {
		if (!reqReport.success) {
			return;
		}
		let promises = []
		for (const nextRequest of this.nextRequests) {
			nextRequest.addPayload(res)
			if (nextRequest.isAllPreviousRequestDone()) {
				promises.push(nextRequest.runRequestAndAssertions())
			}
		}
		return Promise.all(promises)
	}
		
	private generateRequestReport(result :Response, assertionReports :AssertionReport[]) :RequestReport {
		const requestReport: RequestReport = {
			success: this.compareAllAssertionReports(assertionReports),
			time: new Date(),
			request_id: this.getId(),
			request: this.getRequest(),
			response: result,
			previous_request_id: this.prevRequests.map(pr => {
				return pr.getId()	
			}),
			next_request_id: this.nextRequests.map(nr => {
				return nr.getId()
			}),
			assertion_reports: assertionReports
		}
		return requestReport
	}

	private compareAllAssertionReports(assertionReports: AssertionReport[]) :boolean {
		for (const ar of assertionReports) {
			if (!ar.success) {
				return false
			}
		}
		return true
	}
}

export class Assertion<T> implements IAssertion {
	referenceValue: T
	finderFunction: (result: Response) => T
	comparison: string
	report: AssertionReport
	assertionLevel: AssertionLevel

	constructor(assertionLevel :AssertionLevel) {
		this.assertionLevel = assertionLevel
		this.report = {
			assertionLevel: assertionLevel,
			comparison: "empty",
		}	
	}

	public setReferenceValue(referenceValue: T) :void {
		this.referenceValue = referenceValue
	}

	public setComparison(comparison: string) :void {
		this.comparison = comparison
	}

	public setFinderFunction(fn: (result: Response) => T) {
		this.finderFunction = fn	
	}

	public compareValueFromResult(result: Response) :AssertionReport {
		const actualValue = this.finderFunction(result)
		return this.compare(actualValue)
	}

	public compare(actualValue: T) :AssertionReport {
		return this.assertion(actualValue, this.comparison, this.referenceValue)
	}

	public directCompare(actualValue: T, comparison: string, refValue: T) :AssertionReport {
		return this.assertion(actualValue, comparison, refValue)
	}

	public getReport() :AssertionReport {
		return this.report
	}

	private assertion(actualValue: T, comparison: string, refValue: T) :AssertionReport {
		const returnValue = {
			assertionLevel: this.assertionLevel,
			comparison:	`${actualValue} ${comparison} ${refValue}`
		}
		try {
			assert[comparison](actualValue, refValue)
			return {
				...returnValue,
				success: true
			}
		} catch(e) {
			return {
				...returnValue,
				success: false
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
