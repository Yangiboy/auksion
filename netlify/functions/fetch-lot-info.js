const TOKEN = "Bearer eyaiywxnijogikhtmju2iiwginr5cci6icjkv1qsicjjdhkioiaiiib9.nmu0zmi3ymi0njcyzwmwnmriotgwnzcwmzy4yjjhmmyymdnjztjjnq.qtzcufkywzkwtnebceg3sccnqia2jr11ccbvy_lhgoo";

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    const lotId = event.queryStringParameters?.lot_id;
    const lang = event.queryStringParameters?.lang || 'uk';

    if (!lotId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'lot_id is required' })
      };
    }

    const response = await fetch(`https://e-auksion.uz/api/front/lot-info?lot_id=${lotId}&lang=${lang}`, {
      method: 'GET',
      headers: {
        'authorization': TOKEN
      }
    });

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
