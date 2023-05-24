const { AthenaQuery, athenaQuery } = require('./athenaQuery');

/**
 * Athena Search Service
 */
class AthenaClient {
  /**
   * 条件を追加
   * @param {Object} and 条件
   */
  andWhere(and, where) {
    const toString = value => {
      if (typeof value === 'number') {
        return value;
      }
      // escape injection
      return `'${value.replace(/'/, "''")}'`;
    };
    Object.entries(and).forEach(args => {
      const [key, value] = args;
      if (key === 'col-static') {
        where.push(...value);
        return;
      }
      if (Array.isArray(value)) {
        where.push(`${key} IN (${value.map(v => toString(v)).join(', ')})`);
        return;
      }
      if (typeof value === 'object') {
        Object.entries(value).forEach(([operator, attribute]) => {
          where.push(`${key} ${operator} ${toString(attribute)}`);
        });
        return;
      }
      where.push(`${key} = ${toString(value)}`);
    });
  }

  /**
   * クエリの結果を取得
   * @param {Object} execution クエリ情報
   */
  getExecution(execution) {
    return athenaQuery.getExecution(execution).then(status => {
      if (['FAILED', 'CANCELLED'].includes(status.State)) {
        return 'FAILED';
      }
      return status.State;
    });
  }

  setConf(conf) {
    athenaQuery.setConf(conf);
  }

  findScoreA(ts) {
    const athena = new AthenaQuery({ ...athenaQuery.conf });

    const sql = `SELECT
    *
    FROM sample_table
    LIMIT 10`;

    return athena.execute(sql)
    .then(execution => {
      const { QueryExecutionId } = execution;
      return athenaQuery.waitForExecution({ QueryExecutionId }, { sql });
    })
    .then(execution => athenaQuery.getResult(execution))
    .then(result => result.rows);
  }
}

module.exports = {
  AthenaClient,
  athenaClient: new AthenaClient(),
};
