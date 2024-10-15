import { exec } from "child_process";
import { Configuration } from "./config";

// Our base function is commitAndPush, which should commit, create a branch, and push changes

export function commitAndPush(args: { message: string, branchName: string, repoName: string }): Promise<string> {
    let { message, branchName, repoName } = args;

    const repoLocation = `${Configuration.WorkspaceRoot}/${repoName}`;
    // if branchname does not already end with a timestamp, add one
    // do this by cheecking if the last 13 characters are numbers
    if(!/\d{13}$/.test(branchName)) {
        branchName = `${branchName}-${new Date().getTime()}`;
    }
    const completionPromise = new Promise<string>((resolve, reject) => {
        try {
            add(repoLocation, (err, stdout, stderr) => {
                if (err) {
                    console.error(err);
                    reject(err);
                }
                commit(repoLocation, message, (err, stdout, stderr) => {
                    console.error(err);
                    if (err) {
                        reject(err);
                    }
                    checkout(repoLocation, branchName, (err, stdout, stderr) => {
                        console.error(err);
                        if (err) {
                            reject(err);
                        }
                        push(repoLocation, branchName, (err, stdout, stderr) => {
                            console.error(err);
                            if (err) {
                                reject(err);
                            }
                            resolve(branchName);
                        });
                    });
                });
            });
        } catch (err) {
            reject(err);
        }
    });
    return completionPromise;
}

export function add(repoLocation: string, callBack: (err: any, stdout: string, stderr: string) => void): void {
    exec(`git add .`, { cwd: repoLocation }, callBack);
}

export function pull(repoLocation: string, branch: string, callBack: (err: any, stdout: string, stderr: string) => void): void {
    exec(`git pull --no-rebase origin ${branch}`, { cwd: repoLocation }, callBack);
}

export function commit(repoLocation: string, message: string, callBack: (err: any, stdout: string, stderr: string) => void): void {
    exec(`git commit -m "${message}"`, { cwd: repoLocation }, callBack);
}

export function checkoutBranch(args: {branchName: string, repoName: string}): Promise<string> {
    const { branchName, repoName } = args;
    const repoLocation = `${Configuration.WorkspaceRoot}/${repoName}`;
    return new Promise<string>((resolve, reject) => {
        try {
            checkout(repoLocation, branchName, (err, stdout, stderr) => {
                if (err) {
                    if (!err.message.includes("already exists")) {
                        reject(err);
                    }               
                }

                pull(repoLocation, branchName, (err, stdout, stderr) => {
                    resolve(branchName);
                });
            });
        } catch (err) {
            reject(err);
        }
    });
}

export function checkout(repoLocation: string, branchName: string, callBack: (err: any, stdout: string, stderr: string) => void): void {
    exec(`git checkout -b ${branchName}`, { cwd: repoLocation }, callBack);
}

export function push(repoLocation: string, branchName: string, callBack: (err: any, stdout: string, stderr: string) => void): void {
    exec(`git push origin ${branchName}`, { cwd: repoLocation }, callBack);
}