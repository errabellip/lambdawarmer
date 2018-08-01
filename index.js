var bbPromise = require("bluebird"); 
var AWS = require('aws-sdk');

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
    console.log("function_name :", function_name);

    const table_query = {
        TableName: "Lambda_Warmer", // table name of where configuration are kept
        Key: {
            "Function_Name": function_name // ideally to be lambda name to be called
        }
    };

    return await dynamo.getItem(table_query).promise().then(dbValue => invokeLambda(dbValue, function_name)).catch(e => console.log(e));
    //return await dynamo.scan(table_query).promise();

     async function invokeLambda(dbValue, function_name) {
	
	
  
        console.log("in call lambda function");
        var jsonString = JSON.stringify(dbValue);
        var parsedJson = JSON.parse(jsonString);
        console.log("parsedJson >>", parsedJson);
        var target_instance = parsedJson.Item.Target_Instances;
        var active_instance = parsedJson.Item.Active_Instances;
        console.log("target_instance", target_instance);
        console.log("active_instance", active_instance);

		var numInstancesToWakeUp = target_instance - active_instance; 
		
        if (numInstancesToWakeUp>0) {
		   
		    const callLambda = async (functionName, payload) => await bbPromise.fromCallback(cb => lambda.invoke({
                                       FunctionName: functionName,
                                       InvocationType: 'RequestResponse',
                                       Payload: payload
                                    }, cb))
                                    ;
           var params = getFunctionParams(function_name);
           var  i;
		   var promises = [numInstancesToWakeUp];
		   for(i=0; i<numInstancesToWakeUp; i++){
           
            console.log(new Date());
            promises[i] = callLambda(params.functionName, params.payload);
			
			}
			
			const results =  await Promise.all(promises)
							.catch((error) => {
							  console.error('ERROR: \n', error);
							  callback(error);
                            });
            console.log(new Date(), results);
			/*results.forEach(({ StatusCode }, i) => {
			  console.log(`
				REQUEST #${i + 1}:
				RESPONSE: ${StatusCode}
			  `);
			});*/
	
		   
			console.log("Fired <", numInstancesToWakeUp,"> of instances of <", function_name , "> to wake up");
			
        } else {
            console.log("TARGET INSTANCE ARE EQUIVALENT TO ACTIVE INSTANCE");
        }
    }
	
	function getFunctionParams(function_name) {
	
	 const wakeupOptions = {
		Example_Calc: {
		  functionName: 'calculatorRSApp',
		  payload: '{   "resource": "/{proxy+}",   "requestContext": {     "resourceId": "123456",     "apiId": "1234567890",     "resourcePath": "/calculator/add/warmdb",     "httpMethod": "GET",     "requestId": "c6af9ac6-7b61-11e6-9a41-93e8deadbeef",     "accountId": "123456789012",     "identity": {       "apiKey": null,       "userArn": null,       "cognitoAuthenticationType": null,       "caller": null,       "userAgent": "Custom User Agent String",       "user": null,       "cognitoIdentityPoolId": null,       "cognitoIdentityId": null,       "cognitoAuthenticationProvider": null,       "sourceIp": "127.0.0.1",       "accountId": null     },     "stage": "prod"   },   "pathParameters": {     "proxy": "/calculator/warmdb"   },   "httpMethod": "GET",   "path": "/calculator/warmdb" }'
		}
    
		};
		
		return wakeupOptions[function_name];
		
	}
	
	
};
