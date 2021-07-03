# chain-request-ts

Enable user for chaining request reply as a another request body or header.

### Initila features
- Can get multiple reply to compose a request
- Can get a request to feed multiple request
- A circular reqeust check, won't work if there is a circular request
- Assertion check in any request, if there is false,  request won't trigger the next request(s)


### Planned features
- a request map
- request grouping and chaining
