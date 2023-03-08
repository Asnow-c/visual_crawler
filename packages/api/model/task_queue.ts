import { SiteTag, Education } from ".";
export enum TaskState {
    unexecuted = 0,
    executing = 1,
    executed = 2,
    failed = 3,
}

export enum TaskType {
    company = "company",
    jobFilter = "jobFilter",
}
export interface CrawlerPriorityTask {
    /** 任务类型 */
    type: TaskType;
    siteTag: SiteTag;
    status: TaskState;
    /** 优先级, 越小越优先 */
    priority?: number;
    /** 过期时间 */
    expirationTime?: Date;
    taskInfo?: any;
}
export interface CrawlerPriorityJobFilterTask extends CrawlerPriorityTask {
    type: TaskType.jobFilter;
    taskInfo: {
        fixedFilter?: JobFilterOption;
        nonFixedFilter?: JobFilterOption;
    };
}
export interface CrawlerPriorityCompanyTask extends CrawlerPriorityTask {
    type: TaskType.company;
    taskInfo: string;
}
export interface JobFilterOption {
    city?: number;
    emitTime?: Date;
    exp?: number;
    salary?: number;
    eduction?: Education;
    companyScale?: number;
}