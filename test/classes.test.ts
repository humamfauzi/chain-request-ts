import { RequestClass,
	Assertion,
	QueryString,
	Header,
} from '../src/classes'

import {
	Request,
	RequestMethod,
} from '../src/types'

const DEFAULT_HOST = 'https://www.example.com'

describe('Request Class', () => {
	let baseRequestProfile: Request;
	beforeEach(() => {
		baseRequestProfile = {
			host: DEFAULT_HOST,
			path: "/example",
			method: RequestMethod.GET,
			payload: {},
			query: new QueryString("key1=value1"),
			headers: new Header(""),
		};
	});

	it('should instantiate', () => {
		const request = new RequestClass(baseRequestProfile)	
		expect(request.getRequestId().length).toBe(36) 
	});

	it('should set next request', () => {
		const prevRequestProfile = Object.assign({}, baseRequestProfile, {
			query: new QueryString("key2=value2")	
		})
		const prevRequest = new RequestClass(prevRequestProfile)
		const request = new RequestClass(baseRequestProfile)
		prevRequest.setNextRequest(request)
		expect(request.getPreviousRequestId().length).toBe(1)
		expect(request.getPreviousRequestId()[0]).toBe(prevRequest.getRequestId())
	});

	it('should return request detail', () => {})
	it('should run request and fail assertions', () => {})
	it('should run request and pass assertions', () => {})
	it('should not work when previous request does not pass assertion', () => {})
	it('should take all payload from previous payload', () => {})
	it('should be able to trigger multiple next request', () => {})
	it('should generate report if request failed', () => {})
	it('should generate report if request success', () => {})
	it('should generate a map of all request', () => {})
	it('should error if there is a circular request', () => {})
})

describe('Assertion Class', () => {
	it('should pass basic comparison =, <, >', () => {})
	it('should take input and pick relevant value', () => {}) 
})

describe('Query Formation Class', () => {
	it('should instantiate with string', () => {})
	it('should instantiate with object', () => {})
	it('should get string form of query', () => {})
	it('should get object form of query', () => {})
	it('should list all keys contained in query', () => {})
})

describe('Header Formation Class', () => {
	it('should instantiate with string', () => {})
	it('should instantiate with object', () => {})
	it('should get string form of header', () => {})
	it('should get object form of header', () => {})
	it('should list all keys contained in header', () => {})
})
