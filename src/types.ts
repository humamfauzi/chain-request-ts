export enum RequestMethod {
	GET = 'get',
	POST = 'post',
	DELETE = 'delete',
	PUT = 'put',
	OPTION = 'option',
	ANY = 'any',
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
export type Response = {
	code: StatusCode,
	reply: object
}

export type RequestReport = {
	success: boolean
	time: Date
	request_id: string
	request: Request
	response: Response
	previous_request_id: string[]
	next_request_id: string[]
}

export enum AssertionType {
	ERROR = 'error',
	WARNING = 'warning',
}

export enum StatusCode {
	OK = 200,
	NOT_FOUND = 404,
}
