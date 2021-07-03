export enum RequestMethod {
	GET = 'get',
	POST = 'post',
	DELETE = 'delete',
	PUT = 'put',
	OPTIONS = 'options',
}

export type Request = {
	method: RequestMethod,
	host: string,
	path: string,
	payload: object,
	query: IFormation,
	headers: IFormation
}

export interface IFormation {
	toJSON() :object 
	toString() :string
	listKeys() :string[]
}

// TODO: maybe we can use generic instad of any type
export type Response = {
	code: StatusCode,
	reply: any,
	headers: IFormation
}

export type RequestReport = {
	success: boolean
	time: Date
	request_id: string
	request: Request
	response: Response
	previous_request_id: string[]
	next_request_id: string[]
	assertion_reports: AssertionReport[]
}

export enum AssertionLevel {
	ERROR = 'error',
	WARNING = 'warning',
	LOG = 'log',
	IGNORE = 'ignore',
}

export type AssertionReport = {
	assertionLevel: AssertionLevel,
	comparison: string,
	success?: boolean,
}

export enum StatusCode {
	OK = 200,
	NOT_FOUND = 404,
}

export interface IAssertion {
	compareValueFromResult(result: any)
}

export interface IRequestEngine {
	request(req :Request) :Promise<Response>
}

export interface ICircularCheck {
	check() :boolean
}

export interface ISequence {
	getNext() :ISequence[]
	getId() :string
}
