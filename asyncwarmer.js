var bbPromise = require("bluebird"); 
var AWS = require('aws-sdk');
var  async1 = require("async");

console.log('Loading function');
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();
const lambda = new AWS.Lambda({
    region: 'us-east-1'
});
/**
* Provide an event that contains the following keys:
*
*   - operation: one of the operations in the switch statement below
*   - tableName: required for operations that interact with DynamoDB
*   - payload: a parameter to pass to the operation being performed
*/
exports.handler = async (event, context, callback) => {

    console.log('Received event:', JSON.stringify(event, null, 2));


    const function_name = event.function_name;
    const timeToBlock = event.block_time;
    const numInstances = event.num_instances;
    console.log("function_name :", function_name);
    console.log("timeToBlock :", timeToBlock);
    console.log("numInstances :", numInstances);

    await invokeLambda(function_name, numInstances, timeToBlock );

    
     async function invokeLambda(function_name, numInstancesToWakeUp, timeToBlock) {
	
	
  
        console.log("in call lambda function");
       

		if (numInstancesToWakeUp>0) {
		   
		    const callLambda = async (id, functionName, payload) => await bbPromise.fromCallback(cb => { console.log(id, " at ", new Date()); lambda.invoke({
                                       FunctionName: functionName,
                                       InvocationType: 'RequestResponse',
                                       Payload: payload
                                    }, cb)})
                                    ;
           var params = getFunctionParams(function_name);

           console.log("before replace", params.payload);

           var payload  = params.payload.replace(new RegExp("blocktime", 'g'), timeToBlock);
           console.log("after replace all", payload);

           var  i;
           var tasks = [numInstancesToWakeUp];
           var taskPayload;
		   for(i=0; i<numInstancesToWakeUp; i++){
            promisePayload = payload.replace(new RegExp("instanceId", 'g'), i);
            console.log("after instance id replace all", promisePayload);
            promises.push(function(callback){ 
                i :  lambda.invoke({
                    FunctionName: function_name,
                    InvocationType: 'RequestResponse',
                    Payload: promisePayload
                 }, callback);
            
            }); 
		  }
			
            const results =  await Promise.all(promises)
                                            .then()
                                            .catch((error) => {
                                                console.error('ERROR: \n', error);
                                                callback(error);
                                            });
            
            var numWarmed = 0;
            var jsonBody;
            results.forEach(({ StatusCode, Response, Res, Data }, i) => {
                console.log("Response = ", Response);
                console.log("Res = ", Res);
                console.log("Data = ", Data);
                
                console.log(`
                REQUEST #${i + 1}:
                RESPONSE: ${StatusCode}
                body: ${jsonBody}
                `);
            });
    
            
            console.log("Fired <", numInstancesToWakeUp,"> of instances of <", function_name , "> to wake up ; got <", numWarmed, ">");
			
        } else {
            console.log("TARGET INSTANCE ARE EQUIVALENT TO ACTIVE INSTANCE");
        }
    }
	
	function getFunctionParams(function_name) {
	
	 const wakeupOptions = {
		Example_Calc: {
		  functionName: 'calculatorRSApp',
		  payload: '{   "resource": "/{proxy+}",   "requestContext": {     "resourceId": "123456",     "apiId": "1234567890",     "resourcePath": "/calculator/add/warmSleep/{id}/{ims}/{sms}",     "httpMethod": "GET",     "requestId": "c6af9ac6-7b61-11e6-9a41-93e8deadbeef",     "accountId": "123456789012",     "identity": {       "apiKey": null,       "userArn": null,       "cognitoAuthenticationType": null,       "caller": null,       "userAgent": "Custom User Agent String",       "user": null,       "cognitoIdentityPoolId": null,       "cognitoIdentityId": null,       "cognitoAuthenticationProvider": null,       "sourceIp": "127.0.0.1",       "accountId": null     },     "stage": "prod"   },   "pathParameters": {     "proxy": "/calculator/warmSleep/instanceId/blocktime/sleeptime"   },   "httpMethod": "GET",   "path": "/calculator/warmSleep/instanceId/blocktime/sleeptime" } }'
		}
    
		};
		
		return wakeupOptions[function_name];
		
	}
	
	
};
