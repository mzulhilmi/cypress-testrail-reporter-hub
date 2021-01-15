const axios = require('axios');
const chalk = require('chalk');
import { TestRailOptions, TestRailResult } from './testrail.interface';

export class TestRail {
  private base: string;
  private runId: number = null;
  private includeAll: boolean = true;
  private caseIds: number[] = [];
  private description: string;

  constructor(private options: TestRailOptions) {
    this.base = `${options.host}/index.php?/api/v2`;
  }

  public getCases() {
    let url = `${this.base}/get_cases/${this.options.projectId}&suite_id=${this.options.suiteId}`
    if (this.options.groupId) {
      url += `&section_id=${this.options.groupId}`
    }
    if (this.options.filter) {
      url += `&filter=${this.options.filter}`
    }
    return axios({
      method: 'get',
      url: url,
      headers: { 'Content-Type': 'application/json' },
      auth: {
        username: this.options.username,
        password: this.options.password
      }
    })
      .then(response => response.data.map(item => item.id))
      .catch(error => console.error(error));
  }

  public async createRun(name: string, description: string) {
    if (this.options.includeAllInTestRun === false) {
      this.includeAll = false;
      this.caseIds = await this.getCases();
    }
    if (this.options.runId === undefined) {
      axios({
        method: 'post',
        url: `${this.base}/add_run/${this.options.projectId}`,
        headers: { 'Content-Type': 'application/json' },
        auth: {
          username: this.options.username,
          password: this.options.password,
        },
        data: JSON.stringify({
          suite_id: this.options.suiteId,
          name,
          description,
          include_all: this.includeAll,
          case_ids: this.caseIds
        }),
      })
        .then(response => {
          this.runId = response.data.id;
          this.options.runId = this.runId;
          this.description = description;
        })
        .catch(error => console.error(error));
    }
    else {
      this.description = description;
      this.runId = this.options.runId;
    }
  }

  public deleteRun() {
    axios({
      method: 'post',
      url: `${this.base}/delete_run/${this.runId}`,
      headers: { 'Content-Type': 'application/json' },
      auth: {
        username: this.options.username,
        password: this.options.password,
      },
    }).catch(error => console.error(error));
  }

  public publishResults(results: TestRailResult[]) {
    if (results.length > 0) {
      return axios({
        method: 'post',
        url: `${this.base}/add_results_for_cases/${this.runId}`,
        headers: { 'Content-Type': 'application/json' },
        auth: {
          username: this.options.username,
          password: this.options.password,
        },
        data: JSON.stringify({ results }),
      })
        .then(response => {
          console.log('\n', chalk.magenta.underline.bold('(TestRail Reporter)'));
          console.log(
            '\n',
            ` - Results are published to ${chalk.magenta(
              `${this.options.host}/index.php?/runs/view/${this.runId}`
            )}`,
            '\n'
          );
        })
        .catch(error => console.error(error));
    }
  }

  public updateRun(
    caseIds: number[],
    results: TestRailResult[]
  ) {
    return axios({
      method: 'post',
      url: `${this.base}/update_run/${this.runId}`,
      headers: { 'Content-Type': 'application/json' },
      auth: {
        username: this.options.username,
        password: this.options.password
      },
      data: JSON.stringify({
        suite_id: this.options.suiteId,
        description: this.description,
        include_all: false,
        case_ids: caseIds
      })
    })
      .then(() => {
        this.publishResults(results);
      })
      .catch(error => console.error(error));
  }

  public closeRun() {
    axios({
      method: 'post',
      url: `${this.base}/close_run/${this.runId}`,
      headers: { 'Content-Type': 'application/json' },
      auth: {
        username: this.options.username,
        password: this.options.password,
      },
    })
      .then(() => console.log('- Test run closed successfully'))
      .catch(error => console.error(error));
  }
}
