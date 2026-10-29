"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transferPreparedArtifacts = transferPreparedArtifacts;
const JobArtifactSyncIdentity_1 = require("./JobArtifactSyncIdentity");
/** Prepare stays per job. Only compatible source/destination transports are combined. */
async function transferPreparedArtifacts(prepared) {
    const results = prepared.map(row => ({ completed: [], errors: [], files: row.files, foreignOnly: row.foreignOnly }));
    const fail = (index, error) => { const text = String(error?.message || error); if (!results[index].errors.includes(text))
        results[index].errors.push(text); results[index].failure ||= error; };
    const groups = new Map();
    try {
        for (const [index, row] of prepared.entries()) {
            try {
                await row.assertCurrent();
            }
            catch (error) {
                fail(index, error);
                continue;
            }
            for (const request of row.requests) {
                const key = JSON.stringify([request.source, request.destination]);
                const group = groups.get(key);
                if (group)
                    group.push({ index, request });
                else
                    groups.set(key, [{ index, request }]);
            }
        }
        for (const group of groups.values()) {
            try {
                (0, JobArtifactSyncIdentity_1.jobArtifactBatchIdentity)([...new Set(group.map(row => row.index))].map(index => prepared[index].member));
            }
            catch (error) {
                for (const row of group)
                    fail(row.index, error);
                continue;
            }
            const paths = [...new Set(group.flatMap(row => row.request.paths))].sort();
            for (let offset = 0; offset < paths.length; offset += 500) {
                const chunk = paths.slice(offset, offset + 500), valid = [];
                for (const row of group)
                    if (!results[row.index].errors.length) {
                        try {
                            await prepared[row.index].assertCurrent();
                            await row.request.guard(row.request.paths.filter(file => chunk.includes(file)));
                            valid.push(row);
                        }
                        catch (error) {
                            fail(row.index, error);
                        }
                    }
                const active = valid.filter(row => row.request.paths.some(file => chunk.includes(file)));
                const batch = chunk.filter(file => active.some(row => row.request.paths.includes(file)));
                if (!batch.length)
                    continue;
                try {
                    const indexes = [...new Set(valid.map(row => row.index))];
                    const identity = (0, JobArtifactSyncIdentity_1.jobArtifactBatchIdentity)(indexes.map(index => prepared[index].member));
                    await active[0].request.transfer(batch, identity, indexes.length);
                    const checked = await active[0].request.inventory(batch);
                    for (const row of active)
                        for (const file of batch.filter(file => row.request.paths.includes(file))) {
                            if (checked[file]?.sha256?.toLowerCase() !== prepared[row.index].files[file]?.toLowerCase())
                                fail(row.index, Error("文件内容与本次最新产物不符：" + file));
                            else
                                results[row.index].completed.push(file);
                        }
                }
                catch (error) {
                    for (const row of active)
                        fail(row.index, error);
                }
            }
        }
        for (const [index, row] of prepared.entries())
            try {
                await row.assertCurrent();
            }
            catch (error) {
                fail(index, error);
            }
        return results;
    }
    finally {
        for (const row of prepared)
            row.release();
    }
}
