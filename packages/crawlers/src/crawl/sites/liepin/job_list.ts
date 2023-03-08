import { BrowserContext, Response, Page } from "playwright";
import { CompanyCrawlerData, JobCrawlerData, JobFilterOption } from "api/model";
import { SiteTag } from "api/model";
import { PageCrawl, DataParser as DataParser } from "../index";
import { paseJob, RawCompData, RawJobData } from "./classes/common_parser";
import { PageNumController } from "./classes/page_controller";
import { waitTime } from "common/async/time";
import { FilterIteratorFx, ACTION_TIMEOUT } from "../../classes/crawl_action";
/**
 * @event data {jobList:object[], compList:object[]}
 * @event request url:string
 */
export class LiePinJobList extends PageCrawl {
    constructor(context: BrowserContext, readonly origin: string) {
        super(context);
    }
    readonly siteTag = SiteTag.liepin;
    pageNumCtrl?: PageNumController;
    pageFilter?: PageFilter;
    async open(options?: JobFilterOption, timeout = 20 * 1000) {
        if (!this.page) {
            this.page = await super.newPage();
        }
        let page = this.page;
        this.pageNumCtrl = new PageNumController(page);
        this.pageFilter = new PageFilter(page);
        const urlChecker = /apic.liepin.com\/api\/com.liepin.searchfront4c.pc-search-job$/;
        page.on("response", (res) => {
            if (urlChecker.test(res.url())) {
                if (res.ok()) {
                    this.onResponse(res);
                } else {
                    this.reportError({ msg: "响应状态码异常", status: res.status(), statusText: res.statusText() });
                }
            }
        });
        page.on("request", (req) => {
            if (urlChecker.test(req.url())) {
                this.emit("request", req.url());
            }
        });
        const url = this.origin + "/zhaopin/";
        await page.goto(url, { timeout });
    }
    async setFilter(filter: JobFilterOption) {}

    async onResponse(res: Response) {
        let data: ResData[] | undefined = (await res.json().catch(() => {}))?.data?.data?.jobCardList;
        if (typeof data !== "object") {
            this.reportError({ msg: "解析json错误" });
            return;
        }
        const resData = this.paseData(data);
        this.pageCrawlFin(resData);
    }
    async isEmpty() {
        let res = await this.page
            ?.locator(".content-left-section .ant-empty")
            .filter({ hasText: "暂时没有合适的职位" })
            .count();
        return !!res;
    }
    private paseData(data: ResData[]) {
        const jobList: JobCrawlerData[] = [];
        const compList: CompanyCrawlerData[] = [];
        for (let i = 0; i < data.length; i++) {
            let item = data[i];
            let job = item.job;
            let company = item.comp;

            let compData;
            try {
                compData = this.paseCompany(company);
                compList.push(compData);
            } catch (error) {
                this.reportError({ msg: "执行解析公司错误", err: (error as Error).toString() });
            }

            try {
                const { data, errors } = paseJob(job, this.siteTag, {
                    companyId: compData?.companyId,
                    industry: compData?.companyData.industry,
                    scale: compData?.companyData.scale,
                });
                jobList.push(data);
                errors.forEach((err) => this.reportError(err));
            } catch (error) {
                this.reportError({ msg: "执行解析职位错误", err: (error as Error).toString() });
            }
        }
        return { jobList, compList };
    }
    paseCompany(company: RawCompData): CompanyCrawlerData {
        return {
            companyData: {
                name: company.compName,
                scale: DataParser.paseScale(company.compScale),
                industry: company.compIndustry,
                welfareLabel: [],
            },
            companyId: company.compId.toString(),
            exist: true,
            siteTag: SiteTag.liepin,
        };
    }
}

class PageFilter {
    constructor(private readonly page: Page) {}

    // async setEmitTime(cityId: string) {}
    // async setIndustry(cityId: string) {}

    //7
    async *salary(skipCount = 0) {
        let list = await this.getBasicFilters("薪资").locator(".options-item").all();
        for (let i = skipCount; i < list.length; i++) {
            let item = list[i];
            try {
                await item.click({ timeout: ACTION_TIMEOUT });
                yield true;
            } catch (error) {
                yield false;
            }
        }
    }
    //7
    async *experience(skipCount = 0) {
        let list = await this.getBasicFilters("经验").locator(".options-item").all();
        for (let i = skipCount; i < list.length; i++) {
            let item = list[i];
            try {
                await item.click({ timeout: ACTION_TIMEOUT });
                yield true;
            } catch (error) {
                yield false;
            }
        }
    }
    //7
    async *education(skipCount = 0, list = ["初中及以下", "高中", "中专/中技", "大专", "本科", "硕士", "博士"]) {
        // let lastStr = "学历";
        let loc = await this.getOtherFilters().nth(0);
        for (let i = skipCount; i < list.length; i++) {
            let str = list[i];
            try {
                await loc.click({ timeout: ACTION_TIMEOUT });
                await waitTime(200);
                await this.clickSelector(str);
                // lastStr = str;
                yield true;
            } catch (error) {
                yield false;
            }
        }
    }

    //8
    async *compScale(
        skipCount = 0,
        list = ["1-49人", "50-99人", "500-999人", "1000-2000人", "2000-5000人", "5000-10000人", "10000人以上"]
    ) {
        let loc = await this.getOtherFilters().nth(3);
        for (let i = skipCount; i < list.length; i++) {
            let str = list[i];
            try {
                await loc.click({ timeout: ACTION_TIMEOUT });
                await waitTime(200);
                await this.clickSelector(str);
                yield true;
            } catch (error) {
                yield false;
            }
        }
    }
    //6
    async *financingStage(
        skinList = 0,
        list = ["天使轮", "A轮", "B轮", "C轮", "D轮及以上", "已上市", "战略融资", "融资未公开", "其他"]
    ) {
        //融资阶段
        let loc = await this.getOtherFilters().nth(4);
        for (let i = skinList; i < list.length; i++) {
            let str = list[i];
            try {
                await loc.click({ timeout: ACTION_TIMEOUT });
                await waitTime(200);
                await this.clickSelector(str);
                yield true;
            } catch (error) {
                yield false;
            }
        }
    }
    get iterationSequence(): FilterIteratorFx[] {
        return [this.salary, this.experience, this.education, this.compScale, this.financingStage].map((fx) =>
            fx.bind(this)
        );
    }
    private getBasicFilters(title?: string) {
        let loc = this.page.locator(".filter-options-container .filter-options-row-section >.options-row");
        return title ? loc.filter({ hasText: title }) : loc;
    }
    private getOtherFilters() {
        return this.page.locator(
            ".filter-options-container .filter-options-selector-section .row-options-detail-box .select-box"
        );
    }
    private async clickSelector(text: string) {
        let loc = this.page.locator(".ant-select-dropdown .rc-virtual-list-holder .ant-select-item");
        return loc.getByText(text).click({ timeout: ACTION_TIMEOUT });
    }
}

type ResData = { job: RawJobData; comp: RawCompData };

let params: {
    city: string;
    dq: string; //具体地区
    pubTime: string; //发布时间
    key: string;
    suggestTag: string;
    workYearCode: string; //工作经验
    industry: string; //行业
    salary: string; //新增

    compScale: string; //公司规模
    compKind: string; //企业性质
    compStage: string; //融资阶段
    eduLevel: string; //学历
    compTag: string;

    otherCity: string;
    sfrom: string;
    ckId: string;
    scene: string;
    skId: string;
    fkId: string;
    suggestId: string;
};