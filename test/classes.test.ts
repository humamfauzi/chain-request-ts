import { 
	RequestClass,
	Assertion,
	Header,
	QueryString
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

	it('should return request detail', () => {
		const request = new RequestClass(baseRequestProfile)
		const requestDetail = request.getRequest()
		Object.assign(baseRequestProfile, { payload: [ {} ] })
		expect(requestDetail).toStrictEqual(baseRequestProfile)	
	});

	it('should run request and fail assertions', () => {
		const request = new RequestClass(baseRequestProfile)
		const assertion = new Assertion<string>(false)
		return;
	});

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
	it('success assertion', () => {
		const assertion = new Assertion<number>(false);	
		expect(assertion.getReport()).toEqual("empty")
		assertion.directCompare(1, 'equal', 1);
		expect(assertion.getReport()).toEqual("1 equal 1")
	})

	it('failed assertion without throw', () => {
		const assertion = new Assertion<string>(false);
		expect(assertion.getReport()).toEqual("empty")
		assertion.directCompare("asd", 'equal', "asdd");
		expect(assertion.getReport()).toEqual("asd equal asdd")
	})

	it('failed assertion with throw', () => {
		const assertion = new Assertion<string>(true);
		expect(assertion.getReport()).toEqual("empty")
		const exampleFn = () => {
			return assertion.directCompare("asd", 'equal', "asdd")
		}
		expect(exampleFn).toThrow(Error)
		expect(assertion.getReport()).toEqual("asd equal asdd")
	})

	it('use finder function', () => {
		const resultValue = {
			key_one: {
				key_two: "value"	
			}
		}
		const findValue = function(result) {
			return result?.key_one?.key_two	
		}
		const assertion = new Assertion<string>(false)
		assertion.setFinderFunction(findValue)
		assertion.setComparison('equal')
		assertion.setReferenceValue("value")
		const exampleFn = () => {
			return assertion.compareValueFromResult(resultValue)		
		}
		expect(exampleFn).not.toThrow(Error)
		expect(assertion.getReport()).toEqual("value equal value")
	})
	it('should use warning', () => {
		const assertion = new Assertion<string>(false)
		assertion.setWarningLog(true)
		const exampleFn = () => {
			return assertion.directCompare("asd", "equal", "asdd")	
		}	
		const mockFn = jest.spyOn(console, 'log')
		expect(exampleFn).not.toThrow(Error)
		expect(mockFn.mock.calls.length).toBe(1)	
	})
})

describe('Header Formation Class', () => {
	it('should instantiate with string', () => {
		const stringForm = `Content-Type: application/json\nAuthentication: Basic asd123
		`
		const header = new Header(stringForm)
		const objectForm = header.toJSON()
		expect(objectForm["Content-Type"]).toBe("application/json")
	})
	it('should instantiate with object', () => {
		const objectForm = {
			"Content-Type": "application/json",
			"Authentication": "Basic asd123",
		}
		const header = new Header(objectForm)
		const stringForm = header.toString()
		console.log(stringForm)
		expect(stringForm).toEqual("Content-Type: application/json\nAuthentication: Basic asd123")
	
	})
	it('should list all keys contained in header', () => {
		const objectForm = {
			"Content-Type": "application/json",
			"Authentication": "Basic asd123",
		}
		const header = new Header(objectForm)
		expect(header.listKeys()).toEqual([
			"Content-Type",
			"Authentication"	
		])	
	})
})
