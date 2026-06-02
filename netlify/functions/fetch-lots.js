const TOKEN = "Bearer eyaiywxnijogikhtmju2iiwginr5cci6icjkv1qsicjjdhkioiaiiib9.nmu0zmi3ymi0njcyzwmwnmriotgwnzcwmzy4yjjhmmyymdnjztjjnq.qtzcufkywzkwtnebceg3sccnqia2jr11ccbvy_lhgoo";

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    const body = JSON.parse(event.body);

    const response = await fetch('https://e-auksion.uz/api/front/lots', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': TOKEN
      },
      body: JSON.stringify(body)
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
