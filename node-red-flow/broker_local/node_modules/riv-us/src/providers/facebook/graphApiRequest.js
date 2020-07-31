import https from 'https';


export const FACEBOOK_HOST = 'graph.facebook.com';


export default async function graphApiRequest(endpoint, accessToken) {
  return await new Promise((resolve, reject) => {
    const headers = {};
    if (accessToken) {
      headers['access-token'] = accessToken;
    }

    const request = https.get({
      hostname: endpoint.hostname,
      path: endpoint.path,
      headers: headers
    }, message => {
      message.on('data', responseData => {
        if (message.statusCode === 200) {
          try {
            const responseString = responseData.toString('utf8');
            const plainResponse = !accessToken;

            if (plainResponse) {
              resolve(responseString);
            } else {
              resolve(JSON.parse(responseString));
            }
          } catch (e) {
            reject(new Error(`error processing Facebook response: ${e.message}`));
          }

        } else {
          try {
            const json = JSON.parse(responseData.toString('utf8'));
            if (json.error) {
              reject(new Error(
                `error calling Facebook: fb error ${json.error.code}/${json.error.error_subcode}: ` +
                `${json.error.error_user_title}; ` +
                `${json.error.error_user_message}`
              ));
            } else {
              reject(new Error(`error calling Facebook: HTTP ${message.statusCode} ${message.statusMessage}`));
            }
          } catch (e) {
            reject(new Error(`error processing Facebook response: HTTP ${message.statusCode} ${message.statusMessage}`));
          }
        }
      });
    });

    request.on('error', error => {
      reject(new Error(`error calling Facebook: ${error.message}`));
    });
  });
}