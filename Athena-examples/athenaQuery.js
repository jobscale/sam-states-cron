const {
  AthenaClient,
  StartQueryExecutionCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
} = require('@aws-sdk/client-athena');

const athena = new AthenaClient();
const logger = console;
const Default = {
  Database: 'default',
  MaxResults: 1000,
  OutputLocation: 's3://athena-query-results/athena-query-results/',
};

/**
 * Athena Service Class
 */
class AthenaQuery {
  constructor(conf) {
    this.setConf(conf);
  }

  /**
   * 設定
   * @param {Object} conf 設定
   */
  setConf(conf) {
    this.conf = { ...Default, ...conf };
  }

  /**
   * 値を正規化
   * @param {String} Type タイプ
   * @param {any} value 値
   */
  toValue(Type, value) {
    if (['integer', 'bigint'].includes(Type)) {
      const number = parseInt(value, 10);
      if (Number.isNaN(number)) return undefined;
      return number;
    }
    if (Type === 'array') {
      return (value || '')
      .replace(/^\[|]$/g, '')
      .split(', ')
      .filter(v => v !== 'null');
    }
    return value;
  }

  /**
   * クエリの結果を取得
   * @param {Object} execution クエリ情報
   */
  getResult(execution, rows = []) {
    if (!execution.MaxResults) execution.MaxResults = this.conf.MaxResults;
    const command = new GetQueryResultsCommand(execution);
    return athena.send(command)
    .then(async data => {
      const headers = data.ResultSet.ResultSetMetadata.ColumnInfo;
      rows.push(...data.ResultSet.Rows.map(v => {
        const row = {};
        v.Data.forEach((obj, index) => {
          const { Name, Type } = headers[index];
          const [value] = Object.values(obj);
          row[Name] = this.toValue(Type, value);
        });
        return row;
      }));
      if (data.NextToken) {
        await this.getResult({
          ...execution,
          NextToken: data.NextToken,
        }, rows);
      } else rows.shift();
      return { rows };
    });
  }

  /**
   * クエリの結果まで待機
   * @param {Object} options クエリ情報
   */
  waitForExecution(options, extras) {
    const tryMilliseconds = 1000;
    if (!options.prom) {
      const prom = { ms: new Date().getTime() };
      prom.pending = new Promise((...args) => { [prom.resolve, prom.reject] = args; });
      options.prom = prom;
    }

    const {
      QueryExecutionId,
      prom: { pending, resolve, reject },
    } = options;

    this.getExecution({ QueryExecutionId }).then(status => {
      if (status.State === 'SUCCEEDED') {
        logger.debug({
          benchmark: new Date().getTime() - options.prom.ms,
          QueryExecutionId,
        });
        resolve({ QueryExecutionId });
        return;
      }
      if (['FAILED', 'CANCELLED'].includes(status.State)) {
        reject(new Error(`Query ${status.State}`));
        return;
      }
      setTimeout((...args) => this.waitForExecution(...args), tryMilliseconds, options, extras);
    });

    return pending;
  }

  /**
   * クエリの状態を取得
   * @param {Object} execution クエリ情報
   */
  getExecution(execution) {
    const command = new GetQueryExecutionCommand(execution);
    return athena.send(command)
    .then(data => data.QueryExecution.Status);
  }

  /**
   * クエリを実行
   * キャッシュがあるときはキャッシュを返却
   * @param {String} sql クエリ
   */
  execute(sql) {
    const params = {
      QueryString: sql,
      QueryExecutionContext: { Database: this.conf.Database },
      ResultConfiguration: { OutputLocation: this.conf.OutputLocation },
    };
    logger.debug(`[AthenaQuery] ${sql.replace(/\n/g, '')}`);
    const command = new StartQueryExecutionCommand(params);
    return athena.send(command);
  }
}

module.exports = {
  AthenaQuery,
  athenaQuery: new AthenaQuery(),
};
