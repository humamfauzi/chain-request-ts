import { 
	RequestClass,
	Assertion,
	Header,
	QueryString,
	CircularCheck
} from '../src/classes'

import {
	Request,
	RequestMethod,
	AssertionLevel,
	Response,
} from '../src/types'

import {
	AxiosWrapper
} from '../src/backend'

const DEFAULT_HOST = 'https://www.example.com'
const SERVER_REPLY = "server reply"

describe('Request Class', () => {
	let baseRequestProfile: Request;
	let axiosSpy;
	let axiosReply;
	let simpleAssertion;
	beforeEach(() => {
		baseRequestProfile = {
			host: DEFAULT_HOST,
			path: "/example",
			method: RequestMethod.GET,
			payload: [ {} ],
			query: new QueryString("key1=value1"),
			headers: new Header(""),
		};
		axiosReply = {
			code: 200,
			reply: { 
				message: SERVER_REPLY,
				key: "value1",
				misc: "miscValue",
			},

			headers: new Header('')
		}
		axiosSpy = jest.spyOn(AxiosWrapper.prototype, 'request')
		.mockImplementation((req) => { 
			return Promise.resolve(axiosReply)
		});

		simpleAssertion = new Assertion<string>(AssertionLevel.LOG)
		simpleAssertion.setReferenceValue(SERVER_REPLY)
		simpleAssertion.setComparison("equal")
		simpleAssertion.setFinderFunction(function(res: Response) {
			return res.reply.message
		})
 
	});

	it('should instantiate', () => {
		const request = new RequestClass(baseRequestProfile)	
		expect(request.getId().length).toBe(36) 
	});

	it('should set next request', () => {
		const prevRequestProfile = Object.assign({}, baseRequestProfile, {
			query: new QueryString("key2=value2")	
		})
		const prevRequest = new RequestClass(prevRequestProfile)
		const request = new RequestClass(baseRequestProfile)
		prevRequest.setNextRequest(request)
		expect(request.getPrevious().length).toBe(1)
		expect(request.getPrevious()[0].getId()).toBe(prevRequest.getId())
		
	});

	it('should return request detail', () => {
		const request = new RequestClass(baseRequestProfile)
		const requestDetail = request.getRequest()
		Object.assign(baseRequestProfile, { payload: [ {} ] })
		expect(requestDetail).toStrictEqual(baseRequestProfile)	
	});

	it('should run request and pass assertions', async () => {
		const request = new RequestClass(baseRequestProfile)
		request.addAssertion<string>(simpleAssertion)
		await request.runRequestAndAssertions()
		expect(request.getReport().success).toBe(true)
		return;
	});

	it('should run request and fail assertions', async () => {
		const request = new RequestClass(baseRequestProfile)
		simpleAssertion.setComparison("notEqual")
		request.addAssertion<string>(simpleAssertion)
		await request.runRequestAndAssertions()
		expect(request.getReport().success).toBe(false)
		return;
	});

	it('should not work when previous request does not pass assertion', () => {
		const prevRequest = new RequestClass(baseRequestProfile)
		const request = new RequestClass(baseRequestProfile)
		prevRequest.setNextRequest(request)	

		simpleAssertion.setComparison("notEqual")
		prevRequest.addAssertion<string>(simpleAssertion)
		prevRequest.runRequestAndAssertions()
		expect(request.isComplete()).toBe(false)
	})

	it('should take all payload from previous payload', async () => {
	
		const firstPrevRequest = new RequestClass(baseRequestProfile)
		firstPrevRequest.addAssertion<string>(simpleAssertion)
		const secondPrevRequest = new RequestClass(baseRequestProfile)
		secondPrevRequest.addAssertion<string>(simpleAssertion)

		const request = new RequestClass(baseRequestProfile)
		firstPrevRequest.setNextRequest(request)
		secondPrevRequest.setNextRequest(request)

		request.setPayloadFunction(function(obj: any[]) {
			return {
				first_key: obj[1].key,
				second_key: obj[2].misc
			}	
		})
		await Promise.all([
			firstPrevRequest.runRequestAndAssertions(),
			secondPrevRequest.runRequestAndAssertions(),
		])
		const report = request.getReport() 
		expect(report.request.payload).toEqual({
				first_key: "value1",
				second_key: "miscValue",
		})
	})

	it('should be able to trigger multiple next request', async () => {
		const request = new RequestClass(baseRequestProfile)
		const firstNextRequest = new RequestClass(baseRequestProfile)
		const secondNextRequest = new RequestClass(baseRequestProfile)

		request.setNextRequest(firstNextRequest)
		request.setNextRequest(secondNextRequest)
		
		firstNextRequest.setPayloadFunction(function(obj: any[]) {
			return { 	first_key: obj[1].key, }	
		})
		secondNextRequest.setPayloadFunction(function(obj: any[]) {
			return { 	first_key: obj[1].misc, }	
		})
		await request.runRequestAndAssertions()
		let report = firstNextRequest.getReport() 
		expect(report.request.payload).toEqual({
				first_key: "value1",
		})
		report = secondNextRequest.getReport() 
		expect(report.request.payload).toEqual({
				first_key: "miscValue",
		})
	})

	it('should generate report if request failed', async () => {
		const request = new RequestClass(baseRequestProfile)
		simpleAssertion.setComparison("notEqual")

		const anotherAssertion = new Assertion<string>(AssertionLevel.ERROR)
		anotherAssertion.setReferenceValue(SERVER_REPLY)
		anotherAssertion.setComparison("equal")
		anotherAssertion.setFinderFunction(function(res: Response) {
			return res.reply.message
		})
		request.addAssertion<string>(simpleAssertion)
		request.addAssertion<string>(anotherAssertion)
		await request.runRequestAndAssertions()
		expect(request.getReport().success).toBe(false)

		const assertionReports = request.getReport().assertion_reports
		const firstReport = assertionReports[0]
		const secondReport = assertionReports[1]
		expect(firstReport.assertionLevel).toBe(AssertionLevel.LOG)
		expect(firstReport.success).toBe(false)
		expect(secondReport.assertionLevel).toBe(AssertionLevel.ERROR)
		expect(secondReport.success).toBe(true)
		return;
	})
	it('should generate report if request success', async () => {
		const request = new RequestClass(baseRequestProfile)

		const anotherAssertion = new Assertion<string>(AssertionLevel.ERROR)
		anotherAssertion.setReferenceValue(SERVER_REPLY)
		anotherAssertion.setComparison("equal")
		anotherAssertion.setFinderFunction(function(res: Response) {
			return res.reply.message
		})
		request.addAssertion<string>(simpleAssertion)
		request.addAssertion<string>(anotherAssertion)
		await request.runRequestAndAssertions()
		expect(request.getReport().success).toBe(true)

		const assertionReports = request.getReport().assertion_reports
		const firstReport = assertionReports[0]
		const secondReport = assertionReports[1]
		expect(firstReport.assertionLevel).toBe(AssertionLevel.LOG)
		expect(firstReport.success).toBe(true)
		expect(secondReport.assertionLevel).toBe(AssertionLevel.ERROR)
		expect(secondReport.success).toBe(true)
		return;
	})

	it('should generate a map of all request', () => {})
	it('should error if there is a circular request', () => {
	
		const requestA = new RequestClass(baseRequestProfile)
		const requestB = new RequestClass(baseRequestProfile)
		const requestC = new RequestClass(baseRequestProfile)
		
		requestA.setNextRequest(requestB)
		requestB.setNextRequest(requestC)
		requestC.setNextRequest(requestA)

		expect(requestA.checkCircularRequest()).toBe(true)
	})
})

describe('Assertion Class', () => {
	let defaultReplyHeader: Header;
	beforeEach(() => {
		defaultReplyHeader = new Header({
			'Content-Type': 'application/json',
		})	
	})
	it('success assertion', () => {
		const assertion = new Assertion<number>(AssertionLevel.LOG);	
		expect(assertion.getReport().comparison).toEqual("empty")
		assertion.report = assertion.directCompare(1, 'equal', 1);
		expect(assertion.getReport().comparison).toEqual("1 equal 1")
	})

	it('failed assertion without throw', () => {
		const assertion = new Assertion<string>(AssertionLevel.LOG);
		expect(assertion.getReport().comparison).toEqual("empty")
		assertion.report = assertion.directCompare("asd", 'equal', "asdd");
		expect(assertion.getReport().comparison).toEqual("asd equal asdd")
	})

	it('failed assertion with throw', () => {
		const assertion = new Assertion<string>(AssertionLevel.LOG);
		expect(assertion.getReport().comparison).toEqual("empty")
		assertion.report = assertion.directCompare("asd", 'equal', "asdd")
		expect(assertion.getReport().comparison).toEqual("asd equal asdd")
	})

	it('use finder function', () => {
		const payload = {
			key_one: {
				key_two: "value"	
			}
		}
		const res :Response = {
			code: 200,
			reply: payload,
			headers: defaultReplyHeader,
		}	
		const findValue = function(result) {
			return result?.reply?.key_one?.key_two	
		}
		const assertion = new Assertion<string>(AssertionLevel.LOG)
		assertion.setFinderFunction(findValue)
		assertion.setComparison('equal')
		assertion.setReferenceValue("value")
		assertion.report = assertion.compareValueFromResult(res)		
		expect(assertion.getReport().comparison).toEqual("value equal value")
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

describe('Cirucular Check', () => {
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
	it('found circular path', () => {
		const requestA = new RequestClass(baseRequestProfile)
		const requestB = new RequestClass(baseRequestProfile)
		const requestC = new RequestClass(baseRequestProfile)
		
		requestA.setNextRequest(requestB)
		requestB.setNextRequest(requestC)
		requestC.setNextRequest(requestA)

		const checker = new CircularCheck(requestA)
		expect(checker.check()).toBe(true)
	})
	it('not found circular path', () => {
		const requestA = new RequestClass(baseRequestProfile)
		const requestB = new RequestClass(baseRequestProfile)
		const requestC = new RequestClass(baseRequestProfile)

		requestA.setNextRequest(requestB)
		requestB.setNextRequest(requestC)

		const checker = new CircularCheck(requestA)
		expect(checker.check()).toBe(false)
	})
})
