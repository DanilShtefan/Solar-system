(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[turbopack]/browser/dev/hmr-client/hmr-client.ts [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/// <reference path="../../../shared/runtime/runtime-types.d.ts" />
/// <reference path="../../../shared/runtime/dev-globals.d.ts" />
/// <reference path="../../../shared/runtime/dev-protocol.d.ts" />
/// <reference path="../../../shared/runtime/dev-extensions.ts" />
__turbopack_context__.s([
    "connect",
    ()=>connect,
    "setHooks",
    ()=>setHooks,
    "subscribeToUpdate",
    ()=>subscribeToUpdate
]);
function connect({ addMessageListener, sendMessage, onUpdateError = console.error }) {
    addMessageListener((msg)=>{
        switch(msg.type){
            case 'turbopack-connected':
                handleSocketConnected(sendMessage);
                break;
            default:
                try {
                    if (Array.isArray(msg.data)) {
                        for(let i = 0; i < msg.data.length; i++){
                            handleSocketMessage(msg.data[i]);
                        }
                    } else {
                        handleSocketMessage(msg.data);
                    }
                    applyAggregatedUpdates();
                } catch (e) {
                    console.warn('[Fast Refresh] performing full reload\n\n' + "Fast Refresh will perform a full reload when you edit a file that's imported by modules outside of the React rendering tree.\n" + 'You might have a file which exports a React component but also exports a value that is imported by a non-React component file.\n' + 'Consider migrating the non-React component export to a separate file and importing it into both files.\n\n' + 'It is also possible the parent component of the component you edited is a class component, which disables Fast Refresh.\n' + 'Fast Refresh requires at least one parent function component in your React tree.');
                    onUpdateError(e);
                    location.reload();
                }
                break;
        }
    });
    const queued = globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS;
    if (queued != null && !Array.isArray(queued)) {
        throw new Error('A separate HMR handler was already registered');
    }
    globalThis.TURBOPACK_CHUNK_UPDATE_LISTENERS = {
        push: ([chunkPath, callback])=>{
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    };
    if (Array.isArray(queued)) {
        for (const [chunkPath, callback] of queued){
            subscribeToChunkUpdate(chunkPath, sendMessage, callback);
        }
    }
}
const updateCallbackSets = new Map();
function sendJSON(sendMessage, message) {
    sendMessage(JSON.stringify(message));
}
function resourceKey(resource) {
    return JSON.stringify({
        path: resource.path,
        headers: resource.headers || null
    });
}
function subscribeToUpdates(sendMessage, resource) {
    sendJSON(sendMessage, {
        type: 'turbopack-subscribe',
        ...resource
    });
    return ()=>{
        sendJSON(sendMessage, {
            type: 'turbopack-unsubscribe',
            ...resource
        });
    };
}
function handleSocketConnected(sendMessage) {
    for (const key of updateCallbackSets.keys()){
        subscribeToUpdates(sendMessage, JSON.parse(key));
    }
}
// we aggregate all pending updates until the issues are resolved
const chunkListsWithPendingUpdates = new Map();
function aggregateUpdates(msg) {
    const key = resourceKey(msg.resource);
    let aggregated = chunkListsWithPendingUpdates.get(key);
    if (aggregated) {
        aggregated.instruction = mergeChunkListUpdates(aggregated.instruction, msg.instruction);
    } else {
        chunkListsWithPendingUpdates.set(key, msg);
    }
}
function applyAggregatedUpdates() {
    if (chunkListsWithPendingUpdates.size === 0) return;
    hooks.beforeRefresh();
    for (const msg of chunkListsWithPendingUpdates.values()){
        triggerUpdate(msg);
    }
    chunkListsWithPendingUpdates.clear();
    finalizeUpdate();
}
function mergeChunkListUpdates(updateA, updateB) {
    let chunks;
    if (updateA.chunks != null) {
        if (updateB.chunks == null) {
            chunks = updateA.chunks;
        } else {
            chunks = mergeChunkListChunks(updateA.chunks, updateB.chunks);
        }
    } else if (updateB.chunks != null) {
        chunks = updateB.chunks;
    }
    let merged;
    if (updateA.merged != null) {
        if (updateB.merged == null) {
            merged = updateA.merged;
        } else {
            // Since `merged` is an array of updates, we need to merge them all into
            // one, consistent update.
            // Since there can only be `EcmascriptMergeUpdates` in the array, there is
            // no need to key on the `type` field.
            let update = updateA.merged[0];
            for(let i = 1; i < updateA.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateA.merged[i]);
            }
            for(let i = 0; i < updateB.merged.length; i++){
                update = mergeChunkListEcmascriptMergedUpdates(update, updateB.merged[i]);
            }
            merged = [
                update
            ];
        }
    } else if (updateB.merged != null) {
        merged = updateB.merged;
    }
    return {
        type: 'ChunkListUpdate',
        chunks,
        merged
    };
}
function mergeChunkListChunks(chunksA, chunksB) {
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    return chunks;
}
function mergeChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted' || updateA.type === 'deleted' && updateB.type === 'added') {
        return undefined;
    }
    if (updateB.type === 'total') {
        // A total update replaces the entire chunk, so it supersedes any prior update.
        return updateB;
    }
    if (updateA.type === 'partial') {
        invariant(updateA.instruction, 'Partial updates are unsupported');
    }
    if (updateB.type === 'partial') {
        invariant(updateB.instruction, 'Partial updates are unsupported');
    }
    return undefined;
}
function mergeChunkListEcmascriptMergedUpdates(mergedA, mergedB) {
    const entries = mergeEcmascriptChunkEntries(mergedA.entries, mergedB.entries);
    const chunks = mergeEcmascriptChunksUpdates(mergedA.chunks, mergedB.chunks);
    return {
        type: 'EcmascriptMergedUpdate',
        entries,
        chunks
    };
}
function mergeEcmascriptChunkEntries(entriesA, entriesB) {
    return {
        ...entriesA,
        ...entriesB
    };
}
function mergeEcmascriptChunksUpdates(chunksA, chunksB) {
    if (chunksA == null) {
        return chunksB;
    }
    if (chunksB == null) {
        return chunksA;
    }
    const chunks = {};
    for (const [chunkPath, chunkUpdateA] of Object.entries(chunksA)){
        const chunkUpdateB = chunksB[chunkPath];
        if (chunkUpdateB != null) {
            const mergedUpdate = mergeEcmascriptChunkUpdates(chunkUpdateA, chunkUpdateB);
            if (mergedUpdate != null) {
                chunks[chunkPath] = mergedUpdate;
            }
        } else {
            chunks[chunkPath] = chunkUpdateA;
        }
    }
    for (const [chunkPath, chunkUpdateB] of Object.entries(chunksB)){
        if (chunks[chunkPath] == null) {
            chunks[chunkPath] = chunkUpdateB;
        }
    }
    if (Object.keys(chunks).length === 0) {
        return undefined;
    }
    return chunks;
}
function mergeEcmascriptChunkUpdates(updateA, updateB) {
    if (updateA.type === 'added' && updateB.type === 'deleted') {
        // These two completely cancel each other out.
        return undefined;
    }
    if (updateA.type === 'deleted' && updateB.type === 'added') {
        const added = [];
        const deleted = [];
        const deletedModules = new Set(updateA.modules ?? []);
        const addedModules = new Set(updateB.modules ?? []);
        for (const moduleId of addedModules){
            if (!deletedModules.has(moduleId)) {
                added.push(moduleId);
            }
        }
        for (const moduleId of deletedModules){
            if (!addedModules.has(moduleId)) {
                deleted.push(moduleId);
            }
        }
        if (added.length === 0 && deleted.length === 0) {
            return undefined;
        }
        return {
            type: 'partial',
            added,
            deleted
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'partial') {
        const added = new Set([
            ...updateA.added ?? [],
            ...updateB.added ?? []
        ]);
        const deleted = new Set([
            ...updateA.deleted ?? [],
            ...updateB.deleted ?? []
        ]);
        if (updateB.added != null) {
            for (const moduleId of updateB.added){
                deleted.delete(moduleId);
            }
        }
        if (updateB.deleted != null) {
            for (const moduleId of updateB.deleted){
                added.delete(moduleId);
            }
        }
        return {
            type: 'partial',
            added: [
                ...added
            ],
            deleted: [
                ...deleted
            ]
        };
    }
    if (updateA.type === 'added' && updateB.type === 'partial') {
        const modules = new Set([
            ...updateA.modules ?? [],
            ...updateB.added ?? []
        ]);
        for (const moduleId of updateB.deleted ?? []){
            modules.delete(moduleId);
        }
        return {
            type: 'added',
            modules: [
                ...modules
            ]
        };
    }
    if (updateA.type === 'partial' && updateB.type === 'deleted') {
        // We could eagerly return `updateB` here, but this would potentially be
        // incorrect if `updateA` has added modules.
        const modules = new Set(updateB.modules ?? []);
        if (updateA.added != null) {
            for (const moduleId of updateA.added){
                modules.delete(moduleId);
            }
        }
        return {
            type: 'deleted',
            modules: [
                ...modules
            ]
        };
    }
    // Any other update combination is invalid.
    return undefined;
}
function invariant(_, message) {
    throw new Error(`Invariant: ${message}`);
}
const CRITICAL = [
    'bug',
    'error',
    'fatal'
];
function compareByList(list, a, b) {
    const aI = list.indexOf(a) + 1 || list.length;
    const bI = list.indexOf(b) + 1 || list.length;
    return aI - bI;
}
const chunksWithIssues = new Map();
function emitIssues() {
    const issues = [];
    const deduplicationSet = new Set();
    for (const [_, chunkIssues] of chunksWithIssues){
        for (const chunkIssue of chunkIssues){
            if (deduplicationSet.has(chunkIssue.formatted)) continue;
            issues.push(chunkIssue);
            deduplicationSet.add(chunkIssue.formatted);
        }
    }
    sortIssues(issues);
    hooks.issues(issues);
}
function handleIssues(msg) {
    const key = resourceKey(msg.resource);
    let hasCriticalIssues = false;
    for (const issue of msg.issues){
        if (CRITICAL.includes(issue.severity)) {
            hasCriticalIssues = true;
        }
    }
    if (msg.issues.length > 0) {
        chunksWithIssues.set(key, msg.issues);
    } else if (chunksWithIssues.has(key)) {
        chunksWithIssues.delete(key);
    }
    emitIssues();
    return hasCriticalIssues;
}
const SEVERITY_ORDER = [
    'bug',
    'fatal',
    'error',
    'warning',
    'info',
    'log'
];
const CATEGORY_ORDER = [
    'parse',
    'resolve',
    'code generation',
    'rendering',
    'typescript',
    'other'
];
function sortIssues(issues) {
    issues.sort((a, b)=>{
        const first = compareByList(SEVERITY_ORDER, a.severity, b.severity);
        if (first !== 0) return first;
        return compareByList(CATEGORY_ORDER, a.category, b.category);
    });
}
const hooks = {
    beforeRefresh: ()=>{},
    refresh: ()=>{},
    buildOk: ()=>{},
    issues: (_issues)=>{}
};
function setHooks(newHooks) {
    Object.assign(hooks, newHooks);
}
function handleSocketMessage(msg) {
    sortIssues(msg.issues);
    handleIssues(msg);
    switch(msg.type){
        case 'issues':
            break;
        case 'partial':
            // aggregate updates
            aggregateUpdates(msg);
            break;
        default:
            // run single update
            const runHooks = chunkListsWithPendingUpdates.size === 0;
            if (runHooks) hooks.beforeRefresh();
            triggerUpdate(msg);
            if (runHooks) finalizeUpdate();
            break;
    }
}
function finalizeUpdate() {
    hooks.refresh();
    hooks.buildOk();
    // This is used by the Next.js integration test suite to notify it when HMR
    // updates have been completed.
    // TODO: Only run this in test environments (gate by `process.env.__NEXT_TEST_MODE`)
    if (globalThis.__NEXT_HMR_CB) {
        globalThis.__NEXT_HMR_CB();
        globalThis.__NEXT_HMR_CB = null;
    }
}
function subscribeToChunkUpdate(chunkListPath, sendMessage, callback) {
    return subscribeToUpdate({
        path: chunkListPath
    }, sendMessage, callback);
}
function subscribeToUpdate(resource, sendMessage, callback) {
    const key = resourceKey(resource);
    let callbackSet;
    const existingCallbackSet = updateCallbackSets.get(key);
    if (!existingCallbackSet) {
        callbackSet = {
            callbacks: new Set([
                callback
            ]),
            unsubscribe: subscribeToUpdates(sendMessage, resource)
        };
        updateCallbackSets.set(key, callbackSet);
    } else {
        existingCallbackSet.callbacks.add(callback);
        callbackSet = existingCallbackSet;
    }
    return ()=>{
        callbackSet.callbacks.delete(callback);
        if (callbackSet.callbacks.size === 0) {
            callbackSet.unsubscribe();
            updateCallbackSets.delete(key);
        }
    };
}
function triggerUpdate(msg) {
    const key = resourceKey(msg.resource);
    const callbackSet = updateCallbackSets.get(key);
    if (!callbackSet) {
        return;
    }
    for (const callback of callbackSet.callbacks){
        callback(msg);
    }
    if (msg.type === 'notFound') {
        // This indicates that the resource which we subscribed to either does not exist or
        // has been deleted. In either case, we should clear all update callbacks, so if a
        // new subscription is created for the same resource, it will send a new "subscribe"
        // message to the server.
        // No need to send an "unsubscribe" message to the server, it will have already
        // dropped the update stream before sending the "notFound" message.
        updateCallbackSets.delete(key);
    }
}
}),
"[project]/components/Sun.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
function Sun() {
    _s();
    const [texture, setTexture] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("group", {
        position: [
            0,
            0,
            0
        ],
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("mesh", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("sphereGeometry", {
                        args: [
                            3,
                            64,
                            64
                        ]
                    }, void 0, false, {
                        fileName: "[project]/components/Sun.tsx",
                        lineNumber: 9,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("meshBasicMaterial", {
                        color: "#ffaa00"
                    }, void 0, false, {
                        fileName: "[project]/components/Sun.tsx",
                        lineNumber: 10,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/Sun.tsx",
                lineNumber: 8,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("mesh", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("sphereGeometry", {
                        args: [
                            3.5,
                            32,
                            32
                        ]
                    }, void 0, false, {
                        fileName: "[project]/components/Sun.tsx",
                        lineNumber: 13,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("meshBasicMaterial", {
                        color: "#ffdd44",
                        transparent: true,
                        opacity: 0.15,
                        side: 2
                    }, void 0, false, {
                        fileName: "[project]/components/Sun.tsx",
                        lineNumber: 14,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/Sun.tsx",
                lineNumber: 12,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pointLight", {
                intensity: 3,
                color: "#ffffff",
                distance: 200,
                decay: 0.5
            }, void 0, false, {
                fileName: "[project]/components/Sun.tsx",
                lineNumber: 16,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/Sun.tsx",
        lineNumber: 7,
        columnNumber: 5
    }, this);
}
_s(Sun, "KflBP3Bti9pD+e82ty0ZJR7AZNU=");
_c = Sun;
const __TURBOPACK__default__export__ = Sun;
var _c;
__turbopack_context__.k.register(_c, "Sun");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/Planet.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$760a1017$2e$esm$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__ = __turbopack_context__.i("[project]/node_modules/@react-three/fiber/dist/events-760a1017.esm.js [client] (ecmascript) <export D as useFrame>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$drei$2f$web$2f$Html$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@react-three/drei/web/Html.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$drei$2f$core$2f$Texture$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@react-three/drei/core/Texture.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.core.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
;
;
;
;
const planetNames = {
    mercury: 'Меркурий',
    venus: 'Венера',
    earth: 'Земля',
    mars: 'Марс',
    jupiter: 'Юпитер',
    saturn: 'Сатурн',
    uranus: 'Уран',
    neptune: 'Нептун',
    pluto: 'Плутон'
};
function Planet({ name, distance, speed, size, color, description, onSelect, isSelected, textureUrl, ringTextureUrl, clockTimeRef, isDamaged }) {
    _s();
    const groupRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const meshRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [hovered, setHovered] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const texture = textureUrl ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$drei$2f$core$2f$Texture$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useTexture"])(textureUrl) : null;
    const ringTexture = ringTextureUrl ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$drei$2f$core$2f$Texture$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useTexture"])(ringTextureUrl) : null;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$760a1017$2e$esm$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__["useFrame"])({
        "Planet.useFrame": ()=>{
            if (groupRef.current) {
                const t = clockTimeRef ? clockTimeRef.current : 0;
                groupRef.current.position.x = Math.sin(t * speed) * distance;
                groupRef.current.position.z = Math.cos(t * speed) * distance;
            }
            if (meshRef.current && isDamaged) {
                const mat = meshRef.current.material;
                const pulse = Math.sin(performance.now() * 0.008) * 0.3 + 0.5;
                mat.emissive.setRGB(1, 0.2, 0);
                mat.emissiveIntensity = pulse;
                mat.roughness = 0.95;
            }
        }
    }["Planet.useFrame"]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("group", {
        ref: groupRef,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("mesh", {
                ref: meshRef,
                onClick: ()=>onSelect(name, description),
                onPointerOver: ()=>setHovered(true),
                onPointerOut: ()=>setHovered(false),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("sphereGeometry", {
                        args: [
                            size,
                            64,
                            64
                        ]
                    }, void 0, false, {
                        fileName: "[project]/components/Planet.tsx",
                        lineNumber: 57,
                        columnNumber: 9
                    }, this),
                    texture ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("meshStandardMaterial", {
                        map: texture,
                        roughness: isDamaged ? 0.95 : 0.6,
                        metalness: 0.1,
                        emissive: isSelected ? '#ffffff' : isDamaged ? '#ff2200' : '#000000',
                        emissiveIntensity: isSelected ? 0.2 : isDamaged ? 0.5 : 0
                    }, void 0, false, {
                        fileName: "[project]/components/Planet.tsx",
                        lineNumber: 59,
                        columnNumber: 11
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("meshStandardMaterial", {
                        color: color,
                        roughness: isDamaged ? 0.95 : 0.6,
                        metalness: 0.1,
                        emissive: isSelected ? color : isDamaged ? '#ff2200' : '#000000',
                        emissiveIntensity: isSelected ? 0.3 : isDamaged ? 0.5 : 0
                    }, void 0, false, {
                        fileName: "[project]/components/Planet.tsx",
                        lineNumber: 67,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/Planet.tsx",
                lineNumber: 51,
                columnNumber: 7
            }, this),
            isDamaged && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CraterFireEffect, {
                size: size
            }, void 0, false, {
                fileName: "[project]/components/Planet.tsx",
                lineNumber: 77,
                columnNumber: 21
            }, this),
            name === 'saturn' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("mesh", {
                rotation: [
                    Math.PI / 2,
                    0,
                    0
                ],
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ringGeometry", {
                        args: [
                            size * 1.3,
                            size * 2.3,
                            64
                        ]
                    }, void 0, false, {
                        fileName: "[project]/components/Planet.tsx",
                        lineNumber: 81,
                        columnNumber: 11
                    }, this),
                    ringTexture ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("meshBasicMaterial", {
                        map: ringTexture,
                        transparent: true,
                        opacity: 0.8,
                        side: 2
                    }, void 0, false, {
                        fileName: "[project]/components/Planet.tsx",
                        lineNumber: 83,
                        columnNumber: 13
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("meshBasicMaterial", {
                        color: "#aa8866",
                        transparent: true,
                        opacity: 0.6,
                        side: 2
                    }, void 0, false, {
                        fileName: "[project]/components/Planet.tsx",
                        lineNumber: 85,
                        columnNumber: 13
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/Planet.tsx",
                lineNumber: 80,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$drei$2f$web$2f$Html$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Html"], {
                position: [
                    size + 1,
                    0,
                    0
                ],
                center: true,
                distanceFactor: 12,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    style: {
                        color: isSelected ? '#ffffff' : hovered ? '#ffffff' : '#cccccc',
                        fontSize: isSelected ? '16px' : '14px',
                        fontFamily: 'Arial, sans-serif',
                        fontWeight: 'bold',
                        textShadow: '0 0 8px #000000',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                        background: 'rgba(0,0,0,0.5)',
                        padding: '2px 6px',
                        borderRadius: '4px'
                    },
                    children: planetNames[name] || name
                }, void 0, false, {
                    fileName: "[project]/components/Planet.tsx",
                    lineNumber: 90,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/Planet.tsx",
                lineNumber: 89,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/Planet.tsx",
        lineNumber: 50,
        columnNumber: 5
    }, this);
}
_s(Planet, "Wg20UzvLIoMoBbi2a5WNvBzF+9M=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$drei$2f$core$2f$Texture$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useTexture"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$drei$2f$core$2f$Texture$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useTexture"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$760a1017$2e$esm$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__["useFrame"]
    ];
});
_c = Planet;
function CraterFireEffect({ size }) {
    _s1();
    const innerGlowRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const outerGlowRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const sparksRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const lightRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const sparkPositions = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["default"].useMemo({
        "CraterFireEffect.useMemo[sparkPositions]": ()=>{
            const positions = new Float32Array(50 * 3);
            for(let i = 0; i < 50; i++){
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * size * 0.3;
                const height = Math.random() * size * 0.5;
                positions[i * 3] = Math.cos(angle) * radius;
                positions[i * 3 + 1] = height;
                positions[i * 3 + 2] = Math.sin(angle) * radius;
            }
            return positions;
        }
    }["CraterFireEffect.useMemo[sparkPositions]"], [
        size
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$760a1017$2e$esm$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__["useFrame"])({
        "CraterFireEffect.useFrame": ({ clock })=>{
            const t = clock.getElapsedTime();
            const pulse = Math.sin(t * 12) * 0.4 + 0.6;
            const flicker = Math.sin(t * 23) * 0.2 + 0.8;
            if (innerGlowRef.current) {
                const mat = innerGlowRef.current.material;
                mat.opacity = pulse;
            }
            if (outerGlowRef.current) {
                const mat = outerGlowRef.current.material;
                mat.opacity = pulse * 0.5;
            }
            if (lightRef.current) {
                lightRef.current.intensity = 5 * flicker;
            }
            if (sparksRef.current) {
                const positions = sparksRef.current.geometry.attributes.position.array;
                for(let i = 0; i < 50; i++){
                    const idx = i * 3;
                    positions[idx + 1] += 0.02;
                    if (positions[idx + 1] > size * 0.5) {
                        positions[idx + 1] = 0;
                    }
                }
                sparksRef.current.geometry.attributes.position.needsUpdate = true;
            }
        }
    }["CraterFireEffect.useFrame"]);
    const craterPos = [
        size * 0.5,
        size * 0.4,
        size * 0.6
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("group", {
        position: craterPos,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("mesh", {
                rotation: [
                    0,
                    0,
                    0
                ],
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circleGeometry", {
                        args: [
                            size * 0.2,
                            32
                        ]
                    }, void 0, false, {
                        fileName: "[project]/components/Planet.tsx",
                        lineNumber: 163,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("meshBasicMaterial", {
                        color: "#0a0500",
                        side: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["DoubleSide"]
                    }, void 0, false, {
                        fileName: "[project]/components/Planet.tsx",
                        lineNumber: 164,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/Planet.tsx",
                lineNumber: 162,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("mesh", {
                ref: innerGlowRef,
                position: [
                    0,
                    0.01,
                    0
                ],
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circleGeometry", {
                        args: [
                            size * 0.18,
                            32
                        ]
                    }, void 0, false, {
                        fileName: "[project]/components/Planet.tsx",
                        lineNumber: 169,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("meshBasicMaterial", {
                        color: "#ff6600",
                        transparent: true,
                        opacity: 0.8,
                        side: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["DoubleSide"]
                    }, void 0, false, {
                        fileName: "[project]/components/Planet.tsx",
                        lineNumber: 170,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/Planet.tsx",
                lineNumber: 168,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("mesh", {
                ref: outerGlowRef,
                position: [
                    0,
                    0.02,
                    0
                ],
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("circleGeometry", {
                        args: [
                            size * 0.25,
                            32
                        ]
                    }, void 0, false, {
                        fileName: "[project]/components/Planet.tsx",
                        lineNumber: 180,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("meshBasicMaterial", {
                        color: "#ff3300",
                        transparent: true,
                        opacity: 0.4,
                        side: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["DoubleSide"]
                    }, void 0, false, {
                        fileName: "[project]/components/Planet.tsx",
                        lineNumber: 181,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/Planet.tsx",
                lineNumber: 179,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("points", {
                ref: sparksRef,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("bufferGeometry", {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("bufferAttribute", {
                            attach: "attributes-position",
                            count: 50,
                            array: sparkPositions,
                            itemSize: 3
                        }, void 0, false, {
                            fileName: "[project]/components/Planet.tsx",
                            lineNumber: 192,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/Planet.tsx",
                        lineNumber: 191,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pointsMaterial", {
                        size: size * 0.08,
                        color: "#ffaa00",
                        transparent: true,
                        opacity: 0.9,
                        blending: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["AdditiveBlending"],
                        depthWrite: false
                    }, void 0, false, {
                        fileName: "[project]/components/Planet.tsx",
                        lineNumber: 199,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/Planet.tsx",
                lineNumber: 190,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pointLight", {
                ref: lightRef,
                color: "#ff6600",
                intensity: 5,
                distance: size * 3
            }, void 0, false, {
                fileName: "[project]/components/Planet.tsx",
                lineNumber: 210,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/Planet.tsx",
        lineNumber: 160,
        columnNumber: 5
    }, this);
}
_s1(CraterFireEffect, "6SjAvZ+iNnLGB7JncXwtnbk547U=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$760a1017$2e$esm$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__["useFrame"]
    ];
});
_c1 = CraterFireEffect;
const __TURBOPACK__default__export__ = Planet;
var _c, _c1;
__turbopack_context__.k.register(_c, "Planet");
__turbopack_context__.k.register(_c1, "CraterFireEffect");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/Asteroid.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Asteroid
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$760a1017$2e$esm$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__ = __turbopack_context__.i("[project]/node_modules/@react-three/fiber/dist/events-760a1017.esm.js [client] (ecmascript) <export D as useFrame>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.core.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
function Asteroid({ targetX, targetZ, onImpact, active }) {
    _s();
    const meshRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const trailRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const glowRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const startTimeRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(0);
    const trailLength = 30;
    const trailPositions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Asteroid.useMemo[trailPositions]": ()=>{
            const positions = new Float32Array(trailLength * 3);
            for(let i = 0; i < trailLength; i++){
                positions[i * 3] = 0;
                positions[i * 3 + 1] = 0;
                positions[i * 3 + 2] = 90;
            }
            return positions;
        }
    }["Asteroid.useMemo[trailPositions]"], []);
    const positionHistory = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])([]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$760a1017$2e$esm$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__["useFrame"])({
        "Asteroid.useFrame": ({ clock }, delta)=>{
            if (!active || !meshRef.current) return;
            if (startTimeRef.current === 0) {
                startTimeRef.current = clock.getElapsedTime();
            }
            const elapsed = clock.getElapsedTime() - startTimeRef.current;
            const progress = Math.min(elapsed * 0.5, 1);
            const startX = 0;
            const startZ = 90;
            const currentX = startX + (targetX - startX) * progress;
            const currentZ = startZ + (targetZ - startZ) * progress;
            meshRef.current.position.x = currentX;
            meshRef.current.position.z = currentZ;
            meshRef.current.rotation.x += delta * 3;
            meshRef.current.rotation.y += delta * 2;
            positionHistory.current.unshift(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Vector3"](currentX, 0, currentZ));
            if (positionHistory.current.length > trailLength) {
                positionHistory.current.pop();
            }
            if (trailRef.current) {
                const positions = trailRef.current.geometry.attributes.position.array;
                for(let i = 0; i < positionHistory.current.length; i++){
                    positions[i * 3] = positionHistory.current[i].x;
                    positions[i * 3 + 1] = positionHistory.current[i].y;
                    positions[i * 3 + 2] = positionHistory.current[i].z;
                }
                trailRef.current.geometry.attributes.position.needsUpdate = true;
            }
            if (glowRef.current) {
                glowRef.current.position.copy(meshRef.current.position);
                glowRef.current.rotation.x = meshRef.current.rotation.x;
                glowRef.current.rotation.y = meshRef.current.rotation.y;
            }
            const distanceToTarget = Math.sqrt(Math.pow(currentX - targetX, 2) + Math.pow(currentZ - targetZ, 2));
            if (distanceToTarget < 1) {
                startTimeRef.current = 0;
                onImpact();
            }
        }
    }["Asteroid.useFrame"]);
    if (!active) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("group", {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("points", {
                    ref: trailRef,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("bufferGeometry", {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("bufferAttribute", {
                                attach: "attributes-position",
                                count: trailLength,
                                array: trailPositions,
                                itemSize: 3
                            }, void 0, false, {
                                fileName: "[project]/components/Asteroid.tsx",
                                lineNumber: 91,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/Asteroid.tsx",
                            lineNumber: 90,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pointsMaterial", {
                            size: 0.8,
                            color: "#ff6633",
                            transparent: true,
                            opacity: 0.7,
                            blending: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["AdditiveBlending"],
                            depthWrite: false
                        }, void 0, false, {
                            fileName: "[project]/components/Asteroid.tsx",
                            lineNumber: 98,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/Asteroid.tsx",
                    lineNumber: 89,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("mesh", {
                    ref: glowRef,
                    position: [
                        0,
                        0,
                        90
                    ],
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("sphereGeometry", {
                            args: [
                                2.5,
                                16,
                                16
                            ]
                        }, void 0, false, {
                            fileName: "[project]/components/Asteroid.tsx",
                            lineNumber: 109,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("meshBasicMaterial", {
                            color: "#ff4400",
                            transparent: true,
                            opacity: 0.15,
                            side: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["BackSide"]
                        }, void 0, false, {
                            fileName: "[project]/components/Asteroid.tsx",
                            lineNumber: 110,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/Asteroid.tsx",
                    lineNumber: 108,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("mesh", {
                    ref: meshRef,
                    position: [
                        0,
                        0,
                        90
                    ],
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("dodecahedronGeometry", {
                            args: [
                                1.5,
                                0
                            ]
                        }, void 0, false, {
                            fileName: "[project]/components/Asteroid.tsx",
                            lineNumber: 119,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("meshStandardMaterial", {
                            color: "#888888",
                            roughness: 0.9,
                            metalness: 0.3,
                            emissive: "#ff3300",
                            emissiveIntensity: 0.3
                        }, void 0, false, {
                            fileName: "[project]/components/Asteroid.tsx",
                            lineNumber: 120,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/Asteroid.tsx",
                    lineNumber: 118,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/Asteroid.tsx",
            lineNumber: 88,
            columnNumber: 7
        }, this)
    }, void 0, false);
}
_s(Asteroid, "2TN2wiqZpqQRS8cgwh9XN+Ce8GA=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$760a1017$2e$esm$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__["useFrame"]
    ];
});
_c = Asteroid;
var _c;
__turbopack_context__.k.register(_c, "Asteroid");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/ExplosionEffect.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ExplosionEffect
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$760a1017$2e$esm$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__ = __turbopack_context__.i("[project]/node_modules/@react-three/fiber/dist/events-760a1017.esm.js [client] (ecmascript) <export D as useFrame>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.core.js [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
function ExplosionEffect({ explosionPosition, planetSize, active }) {
    _s();
    const shockwaveRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const innerRingRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const particlesRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const flashRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const startTime = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(0);
    const particleCount = 200;
    const particleData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ExplosionEffect.useMemo[particleData]": ()=>{
            const positions = new Float32Array(particleCount * 3);
            const velocities = new Float32Array(particleCount * 3);
            const colors = new Float32Array(particleCount * 3);
            const sizes = new Float32Array(particleCount);
            for(let i = 0; i < particleCount; i++){
                positions[i * 3] = 0;
                positions[i * 3 + 1] = 0;
                positions[i * 3 + 2] = 0;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI;
                const speed = 2 + Math.random() * 8;
                velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
                velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
                velocities[i * 3 + 2] = Math.cos(phi) * speed;
                const colorChoice = Math.random();
                if (colorChoice < 0.4) {
                    colors[i * 3] = 1;
                    colors[i * 3 + 1] = 0.3;
                    colors[i * 3 + 2] = 0;
                } else if (colorChoice < 0.7) {
                    colors[i * 3] = 1;
                    colors[i * 3 + 1] = 0.6;
                    colors[i * 3 + 2] = 0.1;
                } else if (colorChoice < 0.9) {
                    colors[i * 3] = 1;
                    colors[i * 3 + 1] = 0.9;
                    colors[i * 3 + 2] = 0.3;
                } else {
                    colors[i * 3] = 0.8;
                    colors[i * 3 + 1] = 0.8;
                    colors[i * 3 + 2] = 0.9;
                }
                sizes[i] = 0.3 + Math.random() * 0.7;
            }
            return {
                positions,
                velocities,
                colors,
                sizes
            };
        }
    }["ExplosionEffect.useMemo[particleData]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$760a1017$2e$esm$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__["useFrame"])({
        "ExplosionEffect.useFrame": ({ clock })=>{
            if (!active) return;
            const t = clock.getElapsedTime();
            if (startTime.current === 0) {
                startTime.current = t;
            }
            const elapsed = t - startTime.current;
            const duration = 3;
            if (elapsed < duration) {
                if (shockwaveRef.current) {
                    const progress = elapsed / 1.5;
                    const scale = planetSize * (0.8 + progress * 3);
                    shockwaveRef.current.scale.set(scale, scale, scale);
                    shockwaveRef.current.material.opacity = Math.max(0, 1 - progress * 0.8);
                }
                if (innerRingRef.current) {
                    const progress = elapsed / 1.2;
                    const scale = planetSize * (0.5 + progress * 1.5);
                    innerRingRef.current.scale.set(scale, scale, scale);
                    innerRingRef.current.material.opacity = Math.max(0, 1 - progress);
                }
                if (particlesRef.current) {
                    const positions = particlesRef.current.geometry.attributes.position.array;
                    for(let i = 0; i < particleCount; i++){
                        const vx = particleData.velocities[i * 3];
                        const vy = particleData.velocities[i * 3 + 1];
                        const vz = particleData.velocities[i * 3 + 2];
                        positions[i * 3] += vx * 0.016 * Math.min(elapsed * 2, 1);
                        positions[i * 3 + 1] += vy * 0.016 * Math.min(elapsed * 2, 1);
                        positions[i * 3 + 2] += vz * 0.016 * Math.min(elapsed * 2, 1);
                        particleData.velocities[i * 3] *= 0.98;
                        particleData.velocities[i * 3 + 1] *= 0.98;
                        particleData.velocities[i * 3 + 2] *= 0.98;
                    }
                    particlesRef.current.geometry.attributes.position.needsUpdate = true;
                }
                if (flashRef.current) {
                    const flashProgress = elapsed / 0.15;
                    flashRef.current.intensity = flashProgress < 1 ? 50 * (1 - flashProgress) : Math.max(0, 10 - elapsed * 5);
                }
            }
        }
    }["ExplosionEffect.useFrame"]);
    if (!active) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("group", {
        position: [
            explosionPosition.x,
            explosionPosition.y,
            explosionPosition.z
        ],
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pointLight", {
                ref: flashRef,
                position: [
                    0,
                    0,
                    0
                ],
                color: "#ffaa00",
                intensity: 50,
                distance: 20
            }, void 0, false, {
                fileName: "[project]/components/ExplosionEffect.tsx",
                lineNumber: 109,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("mesh", {
                ref: shockwaveRef,
                rotation: [
                    Math.PI / 2,
                    0,
                    0
                ],
                position: [
                    0,
                    0,
                    0
                ],
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ringGeometry", {
                        args: [
                            0.9,
                            1.0,
                            64
                        ]
                    }, void 0, false, {
                        fileName: "[project]/components/ExplosionEffect.tsx",
                        lineNumber: 118,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("meshBasicMaterial", {
                        color: "#ff4400",
                        transparent: true,
                        opacity: 1,
                        side: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["DoubleSide"],
                        blending: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["AdditiveBlending"]
                    }, void 0, false, {
                        fileName: "[project]/components/ExplosionEffect.tsx",
                        lineNumber: 119,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/ExplosionEffect.tsx",
                lineNumber: 117,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("mesh", {
                ref: innerRingRef,
                rotation: [
                    Math.PI / 2,
                    0,
                    0
                ],
                position: [
                    0,
                    0,
                    0
                ],
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ringGeometry", {
                        args: [
                            0.7,
                            0.85,
                            64
                        ]
                    }, void 0, false, {
                        fileName: "[project]/components/ExplosionEffect.tsx",
                        lineNumber: 129,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("meshBasicMaterial", {
                        color: "#ffdd44",
                        transparent: true,
                        opacity: 1,
                        side: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["DoubleSide"],
                        blending: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["AdditiveBlending"]
                    }, void 0, false, {
                        fileName: "[project]/components/ExplosionEffect.tsx",
                        lineNumber: 130,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/ExplosionEffect.tsx",
                lineNumber: 128,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("points", {
                ref: particlesRef,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("bufferGeometry", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("bufferAttribute", {
                                attach: "attributes-position",
                                count: particleCount,
                                array: particleData.positions,
                                itemSize: 3
                            }, void 0, false, {
                                fileName: "[project]/components/ExplosionEffect.tsx",
                                lineNumber: 141,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("bufferAttribute", {
                                attach: "attributes-color",
                                count: particleCount,
                                array: particleData.colors,
                                itemSize: 3
                            }, void 0, false, {
                                fileName: "[project]/components/ExplosionEffect.tsx",
                                lineNumber: 147,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/ExplosionEffect.tsx",
                        lineNumber: 140,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pointsMaterial", {
                        size: 0.5,
                        vertexColors: true,
                        transparent: true,
                        opacity: 0.9,
                        blending: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["AdditiveBlending"],
                        depthWrite: false
                    }, void 0, false, {
                        fileName: "[project]/components/ExplosionEffect.tsx",
                        lineNumber: 154,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/ExplosionEffect.tsx",
                lineNumber: 139,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("mesh", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("sphereGeometry", {
                        args: [
                            planetSize * 0.3,
                            16,
                            16
                        ]
                    }, void 0, false, {
                        fileName: "[project]/components/ExplosionEffect.tsx",
                        lineNumber: 165,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("meshBasicMaterial", {
                        color: "#ff6600",
                        transparent: true,
                        opacity: 0.6
                    }, void 0, false, {
                        fileName: "[project]/components/ExplosionEffect.tsx",
                        lineNumber: 166,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/ExplosionEffect.tsx",
                lineNumber: 164,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/ExplosionEffect.tsx",
        lineNumber: 108,
        columnNumber: 5
    }, this);
}
_s(ExplosionEffect, "IXuRkANut/xbr9CijEawBypycLg=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$760a1017$2e$esm$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__["useFrame"]
    ];
});
_c = ExplosionEffect;
var _c;
__turbopack_context__.k.register(_c, "ExplosionEffect");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/TimeTracker.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>TimeTracker
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$760a1017$2e$esm$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__ = __turbopack_context__.i("[project]/node_modules/@react-three/fiber/dist/events-760a1017.esm.js [client] (ecmascript) <export D as useFrame>");
var _s = __turbopack_context__.k.signature();
;
;
function TimeTracker({ timeRef, paused }) {
    _s();
    const totalWorkRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(0);
    const lastTimeRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(0);
    const wasPausedRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$760a1017$2e$esm$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__["useFrame"])({
        "TimeTracker.useFrame": ({ clock })=>{
            const current = clock.getElapsedTime();
            const delta = current - lastTimeRef.current;
            lastTimeRef.current = current;
            if (!wasPausedRef.current && paused) {
                wasPausedRef.current = true;
            } else if (wasPausedRef.current && !paused) {
                wasPausedRef.current = false;
            }
            if (!paused) {
                totalWorkRef.current += delta;
            }
            timeRef.current = totalWorkRef.current;
        }
    }["TimeTracker.useFrame"]);
    return null;
}
_s(TimeTracker, "YH7is1t4xMm2e77NlGcgnmrOG8M=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$760a1017$2e$esm$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__["useFrame"]
    ];
});
_c = TimeTracker;
var _c;
__turbopack_context__.k.register(_c, "TimeTracker");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/GlobeScene.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>GlobeScene
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/index.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$react$2d$three$2d$fiber$2e$esm$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@react-three/fiber/dist/react-three-fiber.esm.js [client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$760a1017$2e$esm$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__ = __turbopack_context__.i("[project]/node_modules/@react-three/fiber/dist/events-760a1017.esm.js [client] (ecmascript) <export D as useFrame>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$drei$2f$core$2f$OrbitControls$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@react-three/drei/core/OrbitControls.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$drei$2f$core$2f$Stars$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@react-three/drei/core/Stars.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/three/build/three.core.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Sun$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/Sun.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Planet$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/Planet.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Asteroid$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/Asteroid.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ExplosionEffect$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/ExplosionEffect.tsx [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$TimeTracker$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/TimeTracker.tsx [client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
;
;
;
;
;
;
;
;
;
const planetDistances = {
    mercury: 8,
    venus: 12,
    earth: 18,
    mars: 24,
    jupiter: 35,
    saturn: 48,
    uranus: 62,
    neptune: 75,
    pluto: 88
};
const planetSpeeds = {
    mercury: 0.8,
    venus: 0.5,
    earth: 0.3,
    mars: 0.2,
    jupiter: 0.1,
    saturn: 0.07,
    uranus: 0.05,
    neptune: 0.04,
    pluto: 0.03
};
const planetSizes = {
    mercury: 0.4,
    venus: 0.9,
    earth: 1,
    mars: 0.5,
    jupiter: 2.5,
    saturn: 2.1,
    uranus: 1.4,
    neptune: 1.3,
    pluto: 0.3
};
const planetData = {
    mercury: {
        name: 'Меркурий',
        description: 'Самая маленькая и ближайшая к Солнцу планета. День длится 59 земных суток, год - 88 суток.'
    },
    venus: {
        name: 'Венера',
        description: 'Вторая планета от Солнца. Самая горячая планета из-за парникового эффекта.'
    },
    earth: {
        name: 'Земля',
        description: 'Третья планета от Солнца. Единственная известная планета с жизнью.'
    },
    mars: {
        name: 'Марс',
        description: 'Четвёртая планета. Красная планета из-за оксида железа.'
    },
    jupiter: {
        name: 'Юпитер',
        description: 'Крупнейшая планета Солнечной системы. Газовый гигант.'
    },
    saturn: {
        name: 'Сатурн',
        description: 'Вторая по величине планета. Знаменита своими кольцами.'
    },
    uranus: {
        name: 'Уран',
        description: 'Седьмая планета. Ледяной гигант.'
    },
    neptune: {
        name: 'Нептун',
        description: 'Восьмая планета. Ледяной гигант с самыми сильными ветрами.'
    },
    pluto: {
        name: 'Плутон',
        description: 'Карликовая планета.'
    }
};
function GlobeScene() {
    _s();
    const [selectedPlanet, setSelectedPlanet] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [targetPlanet, setTargetPlanet] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [asteroidActive, setAsteroidActive] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [explosionActive, setExplosionActive] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isPaused, setIsPaused] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [damagedPlanets, setDamagedPlanets] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useState"])(new Set());
    const clockTimeRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(0);
    const explosionPosRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Vector3"]());
    const asteroidTargetRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const handleSelect = (name, description)=>{
        setSelectedPlanet(selectedPlanet === name ? null : name);
        setTargetPlanet(null);
        setAsteroidActive(false);
        setExplosionActive(false);
    };
    const handleGoTo = (name)=>{
        setTargetPlanet(name);
        setSelectedPlanet(null);
    };
    const handleLaunchAsteroid = ()=>{
        if (selectedPlanet && selectedPlanet !== 'pluto') {
            const distance = planetDistances[selectedPlanet];
            const speed = planetSpeeds[selectedPlanet];
            const x = Math.sin(clockTimeRef.current * speed) * distance;
            const z = Math.cos(clockTimeRef.current * speed) * distance;
            asteroidTargetRef.current = {
                x,
                z
            };
            explosionPosRef.current.set(x, 0, z);
            setIsPaused(true);
            setAsteroidActive(true);
            setExplosionActive(false);
        }
    };
    const handleResetAsteroid = ()=>{
        asteroidTargetRef.current = null;
        setIsPaused(false);
        setAsteroidActive(false);
        setExplosionActive(false);
        clearDamage();
    };
    const handleImpact = ()=>{
        setAsteroidActive(false);
        setExplosionActive(true);
        if (selectedPlanet) {
            setDamagedPlanets((prev)=>new Set(prev).add(selectedPlanet));
        }
    };
    const clearDamage = ()=>{
        setDamagedPlanets(new Set());
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        style: {
            width: '100vw',
            height: '100vh',
            background: '#000000',
            overflow: 'hidden',
            margin: 0,
            padding: 0,
            position: 'fixed',
            top: 0,
            left: 0
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$react$2d$three$2d$fiber$2e$esm$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Canvas"], {
                camera: {
                    position: [
                        0,
                        50,
                        90
                    ],
                    fov: 50
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$TimeTracker$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                        timeRef: clockTimeRef,
                        paused: isPaused
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 97,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ambientLight", {
                        intensity: 0.1
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 98,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("pointLight", {
                        position: [
                            0,
                            0,
                            0
                        ],
                        intensity: 3,
                        distance: 200,
                        color: "#ffffff"
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 99,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$drei$2f$core$2f$Stars$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Stars"], {
                        radius: 100,
                        depth: 50,
                        count: 5000,
                        factor: 4,
                        saturation: 0,
                        fade: true,
                        speed: 1
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 101,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Sun$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 103,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(OrbitLine, {
                        distance: 8,
                        color: "#666666"
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 105,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Planet$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                        name: "mercury",
                        distance: 8,
                        speed: 0.8,
                        size: 0.4,
                        color: "#aaaaaa",
                        description: planetData.mercury.description,
                        onSelect: handleSelect,
                        isSelected: selectedPlanet === 'mercury',
                        textureUrl: "/textures/Mercury/mercury.jpg",
                        clockTimeRef: clockTimeRef,
                        isDamaged: damagedPlanets.has('mercury')
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 106,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(OrbitLine, {
                        distance: 12,
                        color: "#665533"
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 108,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Planet$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                        name: "venus",
                        distance: 12,
                        speed: 0.5,
                        size: 0.9,
                        color: "#ddcc88",
                        description: planetData.venus.description,
                        onSelect: handleSelect,
                        isSelected: selectedPlanet === 'venus',
                        textureUrl: "/textures/Venus/venus_surface.jpg",
                        clockTimeRef: clockTimeRef,
                        isDamaged: damagedPlanets.has('venus')
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 109,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(OrbitLine, {
                        distance: 18,
                        color: "#334466"
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 111,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Planet$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                        name: "earth",
                        distance: 18,
                        speed: 0.3,
                        size: 1,
                        color: "#2266cc",
                        description: planetData.earth.description,
                        onSelect: handleSelect,
                        isSelected: selectedPlanet === 'earth',
                        textureUrl: "/textures/Earth/earth.jpg",
                        clockTimeRef: clockTimeRef,
                        isDamaged: damagedPlanets.has('earth')
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 112,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(OrbitLine, {
                        distance: 24,
                        color: "#553322"
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 114,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Planet$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                        name: "mars",
                        distance: 24,
                        speed: 0.2,
                        size: 0.5,
                        color: "#dd4422",
                        description: planetData.mars.description,
                        onSelect: handleSelect,
                        isSelected: selectedPlanet === 'mars',
                        textureUrl: "/textures/Mars/8k_mars.jpg",
                        clockTimeRef: clockTimeRef,
                        isDamaged: damagedPlanets.has('mars')
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 115,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(OrbitLine, {
                        distance: 35,
                        color: "#554433"
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 117,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Planet$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                        name: "jupiter",
                        distance: 35,
                        speed: 0.1,
                        size: 2.5,
                        color: "#ddaa77",
                        description: planetData.jupiter.description,
                        onSelect: handleSelect,
                        isSelected: selectedPlanet === 'jupiter',
                        textureUrl: "/textures/Jupiter/jupiter.jpg",
                        clockTimeRef: clockTimeRef,
                        isDamaged: damagedPlanets.has('jupiter')
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 118,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(OrbitLine, {
                        distance: 48,
                        color: "#aa9977"
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 120,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Planet$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                        name: "saturn",
                        distance: 48,
                        speed: 0.07,
                        size: 2.1,
                        color: "#eedd99",
                        description: planetData.saturn.description,
                        onSelect: handleSelect,
                        isSelected: selectedPlanet === 'saturn',
                        textureUrl: "/textures/Saturn/saturn.jpg",
                        ringTextureUrl: "/textures/Saturn/saturn_ring_alpha.png",
                        clockTimeRef: clockTimeRef,
                        isDamaged: damagedPlanets.has('saturn')
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 121,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(OrbitLine, {
                        distance: 62,
                        color: "#6699cc"
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 123,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Planet$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                        name: "uranus",
                        distance: 62,
                        speed: 0.05,
                        size: 1.4,
                        color: "#88ddff",
                        description: planetData.uranus.description,
                        onSelect: handleSelect,
                        isSelected: selectedPlanet === 'uranus',
                        textureUrl: "/textures/Uranus/uranus.jpg",
                        clockTimeRef: clockTimeRef,
                        isDamaged: damagedPlanets.has('uranus')
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 124,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(OrbitLine, {
                        distance: 75,
                        color: "#4466aa"
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 126,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Planet$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                        name: "neptune",
                        distance: 75,
                        speed: 0.04,
                        size: 1.3,
                        color: "#4466ff",
                        description: planetData.neptune.description,
                        onSelect: handleSelect,
                        isSelected: selectedPlanet === 'neptune',
                        textureUrl: "/textures/Neptune/neptune.jpg",
                        clockTimeRef: clockTimeRef,
                        isDamaged: damagedPlanets.has('neptune')
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 127,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(OrbitLine, {
                        distance: 88,
                        color: "#887766"
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 129,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Planet$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                        name: "pluto",
                        distance: 88,
                        speed: 0.03,
                        size: 0.3,
                        color: "#ccaa88",
                        description: planetData.pluto.description,
                        onSelect: handleSelect,
                        isSelected: selectedPlanet === 'pluto',
                        clockTimeRef: clockTimeRef,
                        isDamaged: damagedPlanets.has('pluto')
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 130,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(OrbitController, {
                        targetPlanet: targetPlanet
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 132,
                        columnNumber: 9
                    }, this),
                    asteroidActive && asteroidTargetRef.current && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$Asteroid$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                        targetX: asteroidTargetRef.current.x,
                        targetZ: asteroidTargetRef.current.z,
                        onImpact: handleImpact,
                        active: asteroidActive
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 135,
                        columnNumber: 11
                    }, this),
                    explosionActive && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$ExplosionEffect$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {
                        explosionPosition: explosionPosRef.current,
                        planetSize: planetSizes[selectedPlanet || 'earth'] || 1,
                        active: explosionActive
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 144,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/GlobeScene.tsx",
                lineNumber: 96,
                columnNumber: 7
            }, this),
            selectedPlanet && selectedPlanet !== 'pluto' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'rgba(20, 20, 40, 0.9)',
                    border: '1px solid #4488ff',
                    borderRadius: '12px',
                    padding: '20px',
                    color: '#ffffff',
                    fontFamily: 'Arial, sans-serif',
                    maxWidth: '300px',
                    boxShadow: '0 0 20px rgba(68, 136, 255, 0.3)'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        style: {
                            margin: '0 0 10px 0',
                            color: '#4488ff'
                        },
                        children: planetData[selectedPlanet].name
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 154,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        style: {
                            margin: '0 0 15px 0',
                            lineHeight: 1.5
                        },
                        children: planetData[selectedPlanet].description
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 155,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>handleGoTo(selectedPlanet),
                        style: {
                            background: '#4488ff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '10px 20px',
                            color: '#ffffff',
                            fontSize: '14px',
                            cursor: 'pointer',
                            width: '100%',
                            fontWeight: 'bold',
                            marginBottom: '8px'
                        },
                        children: "Перейти к планете"
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 156,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: handleLaunchAsteroid,
                        disabled: asteroidActive,
                        style: {
                            background: asteroidActive ? '#666666' : '#ff4422',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '10px 20px',
                            color: '#ffffff',
                            fontSize: '14px',
                            cursor: asteroidActive ? 'not-allowed' : 'pointer',
                            width: '100%',
                            fontWeight: 'bold',
                            marginBottom: '8px'
                        },
                        children: isPaused ? 'Продолжить' : 'Запустить астероид'
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 159,
                        columnNumber: 11
                    }, this),
                    isPaused && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: handleResetAsteroid,
                        style: {
                            background: '#44aa44',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '10px 20px',
                            color: '#ffffff',
                            fontSize: '14px',
                            cursor: 'pointer',
                            width: '100%',
                            fontWeight: 'bold'
                        },
                        children: "Сбросить"
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 163,
                        columnNumber: 13
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/GlobeScene.tsx",
                lineNumber: 153,
                columnNumber: 9
            }, this),
            selectedPlanet === 'pluto' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                style: {
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'rgba(20, 20, 40, 0.9)',
                    border: '1px solid #4488ff',
                    borderRadius: '12px',
                    padding: '20px',
                    color: '#ffffff',
                    fontFamily: 'Arial, sans-serif',
                    maxWidth: '300px',
                    boxShadow: '0 0 20px rgba(68, 136, 255, 0.3)'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        style: {
                            margin: '0 0 10px 0',
                            color: '#4488ff'
                        },
                        children: planetData.pluto.name
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 172,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        style: {
                            margin: '0 0 15px 0',
                            lineHeight: 1.5
                        },
                        children: planetData.pluto.description
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 173,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>handleGoTo('pluto'),
                        style: {
                            background: '#4488ff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '10px 20px',
                            color: '#ffffff',
                            fontSize: '14px',
                            cursor: 'pointer',
                            width: '100%',
                            fontWeight: 'bold'
                        },
                        children: "Перейти к планете"
                    }, void 0, false, {
                        fileName: "[project]/components/GlobeScene.tsx",
                        lineNumber: 174,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/GlobeScene.tsx",
                lineNumber: 171,
                columnNumber: 9
            }, this),
            targetPlanet && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: ()=>setTargetPlanet(null),
                style: {
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#ff6644',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '12px 24px',
                    color: '#ffffff',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    boxShadow: '0 0 15px rgba(255, 102, 68, 0.5)'
                },
                children: "Вернуться к Солнцу"
            }, void 0, false, {
                fileName: "[project]/components/GlobeScene.tsx",
                lineNumber: 181,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/GlobeScene.tsx",
        lineNumber: 95,
        columnNumber: 5
    }, this);
}
_s(GlobeScene, "Ni/GyNYWSG0wWR8FYMUuAx1R4DU=");
_c = GlobeScene;
function OrbitController({ targetPlanet }) {
    _s1();
    const controlsRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const targetRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$index$2e$js__$5b$client$5d$__$28$ecmascript$29$__["useRef"])(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$three$2f$build$2f$three$2e$core$2e$js__$5b$client$5d$__$28$ecmascript$29$__["Vector3"](0, 0, 0));
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$760a1017$2e$esm$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__["useFrame"])({
        "OrbitController.useFrame": ({ clock })=>{
            if (targetPlanet && planetDistances[targetPlanet] !== undefined) {
                const distance = planetDistances[targetPlanet];
                const speed = planetSpeeds[targetPlanet] || 0.3;
                const t = clock.getElapsedTime();
                const x = Math.sin(t * speed) * distance;
                const z = Math.cos(t * speed) * distance;
                targetRef.current.set(x, 0, z);
            } else {
                targetRef.current.set(0, 0, 0);
            }
            if (controlsRef.current) {
                controlsRef.current.target.copy(targetRef.current);
                controlsRef.current.update();
            }
        }
    }["OrbitController.useFrame"]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$drei$2f$core$2f$OrbitControls$2e$js__$5b$client$5d$__$28$ecmascript$29$__["OrbitControls"], {
        ref: controlsRef,
        enableRotate: true,
        enableZoom: true,
        minDistance: 3,
        maxDistance: 150
    }, void 0, false, {
        fileName: "[project]/components/GlobeScene.tsx",
        lineNumber: 211,
        columnNumber: 5
    }, this);
}
_s1(OrbitController, "Oj0em03/ZT4qaE8qZpq8qwPUnGI=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$react$2d$three$2f$fiber$2f$dist$2f$events$2d$760a1017$2e$esm$2e$js__$5b$client$5d$__$28$ecmascript$29$__$3c$export__D__as__useFrame$3e$__["useFrame"]
    ];
});
_c1 = OrbitController;
function OrbitLine({ distance, color }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("mesh", {
        rotation: [
            Math.PI / 2,
            0,
            0
        ],
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ringGeometry", {
                args: [
                    distance - 0.05,
                    distance + 0.05,
                    64
                ]
            }, void 0, false, {
                fileName: "[project]/components/GlobeScene.tsx",
                lineNumber: 218,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])("meshBasicMaterial", {
                color: color,
                transparent: true,
                opacity: 0.3,
                side: 2
            }, void 0, false, {
                fileName: "[project]/components/GlobeScene.tsx",
                lineNumber: 219,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/GlobeScene.tsx",
        lineNumber: 217,
        columnNumber: 5
    }, this);
}
_c2 = OrbitLine;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "GlobeScene");
__turbopack_context__.k.register(_c1, "OrbitController");
__turbopack_context__.k.register(_c2, "OrbitLine");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/pages/index.tsx [client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/react/jsx-dev-runtime.js [client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$GlobeScene$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/GlobeScene.tsx [client] (ecmascript)");
;
;
const HomePage = ()=>{
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$GlobeScene$2e$tsx__$5b$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
        fileName: "[project]/pages/index.tsx",
        lineNumber: 5,
        columnNumber: 10
    }, ("TURBOPACK compile-time value", void 0));
};
_c = HomePage;
const __TURBOPACK__default__export__ = HomePage;
var _c;
__turbopack_context__.k.register(_c, "HomePage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[next]/entry/page-loader.ts { PAGE => \"[project]/pages/index.tsx [client] (ecmascript)\" } [client] (ecmascript)", ((__turbopack_context__, module, exports) => {

const PAGE_PATH = "/";
(window.__NEXT_P = window.__NEXT_P || []).push([
    PAGE_PATH,
    ()=>{
        return __turbopack_context__.r("[project]/pages/index.tsx [client] (ecmascript)");
    }
]);
// @ts-expect-error module.hot exists
if ("TURBOPACK compile-time truthy", 1) {
    // @ts-expect-error module.hot exists
    module.hot.dispose(function() {
        window.__NEXT_P.push([
            PAGE_PATH
        ]);
    });
}
}),
"[hmr-entry]/hmr-entry.js { ENTRY => \"[project]/pages/index\" }", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.r("[next]/entry/page-loader.ts { PAGE => \"[project]/pages/index.tsx [client] (ecmascript)\" } [client] (ecmascript)");
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__082xwnd._.js.map