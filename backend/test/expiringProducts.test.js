const assert = require('node:assert/strict');
const test = require('node:test');

const dbPath = require.resolve('../api/db');
const controllerPath = require.resolve('../api/controllers/productsController');
const queryCalls = [];

require.cache[dbPath] = {
  exports: {
    pool: {
      query: async (text, values) => {
        queryCalls.push({ text, values });
        return { rows: [] };
      }
    }
  }
};
delete require.cache[controllerPath];

const { getExpiringProducts } = require(controllerPath);
const { validateExpiringProductsQuery } = require('../api/validators/productValidator');
const productsRouter = require('../api/routes/productsRoutes');

const createResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

const validate = (query) => {
  const req = { query };
  const res = createResponse();
  let nextCalled = false;

  validateExpiringProductsQuery(req, res, () => {
    nextCalled = true;
  });

  return { req, res, nextCalled };
};

test.beforeEach(() => {
  queryCalls.length = 0;
});

test('authenticates and validates before executing the expiring-products controller', () => {
  const route = productsRouter.stack.find(layer => layer.route?.path === '/expiring').route;

  assert.deepEqual(
    route.stack.map(layer => layer.handle.name),
    ['authenticate', 'validateExpiringProductsQuery', 'getExpiringProducts']
  );
});

test('accepts positive integer days and preserves the default', async () => {
  for (const [input, expected] of [[undefined, 90], ['1', 1], ['7', 7], ['30', 30]]) {
    const query = input === undefined ? {} : { days: input };
    const { req, res, nextCalled } = validate(query);

    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, 200);
    assert.equal(req.validatedExpiringProductsQuery.days, expected);

    await getExpiringProducts(req, res);
    assert.equal(res.body.success, true);
  }

  assert.deepEqual(queryCalls.map(call => call.values), [[90], [1], [7], [30]]);
});

test('rejects malformed days before database execution', () => {
  for (const days of ['abc', '-1', '0', '1.5', '', '30 OR 1=1', ['1', '7']]) {
    const { res, nextCalled } = validate({ days });

    assert.equal(nextCalled, false, `unexpectedly accepted ${JSON.stringify(days)}`);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'Validation failed');
  }

  assert.equal(queryCalls.length, 0);
});

test('binds days separately from static SQL text', async () => {
  const { req, res, nextCalled } = validate({ days: '30' });
  assert.equal(nextCalled, true);

  await getExpiringProducts(req, res);

  assert.equal(queryCalls.length, 1);
  assert.match(queryCalls[0].text, /INTERVAL '1 day' \* \$1/);
  assert.doesNotMatch(queryCalls[0].text, /30/);
  assert.deepEqual(queryCalls[0].values, [30]);
});
