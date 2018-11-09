import { routeParamCheckI, requestLoginType, requestMessageType,standardRequest } from "./types";
import { hasUser } from "./dataPersistence";
import { ErrorCode } from "./code";
import { sendErrorMessage, dataCompare as Compare,logError } from "./public";
import * as webSocket from "ws";

const dataCompare = new Compare();

dataCompare.setStandardCompare('login',{
    type:'string',
    nickName:'string'
});
dataCompare.setStandardCompare('message',{
    type:'string',
    nickName:'string',
    auth:'string',
    message:'string'
});

/**
 * 执行路由前的参数完整性检查
 */
export const paramCheck: routeParamCheckI = {
    login(request: requestLoginType) {

        // 获取状态码
        const compareStateCode = dataCompare.compare('login',request);

        if(!compareStateCode){
            
            if(hasUser(request.nickName)){
                return ErrorCode['login:该昵称已经有人使用'];
            }

            return true;

        }

        if(compareStateCode == 1){
            return ErrorCode['login:类型请求缺少必要的参数'];
        }else{
            return ErrorCode['system:请求参数错误'];
        }

    },
    message(request: requestMessageType) {

        // 获取状态码
        const compareStateCode = dataCompare.compare('message', request);

        if(!compareStateCode){

            const userId = request.nickName+request.auth;

            if(!hasUser(request.nickName)){
                return ErrorCode['system:用户不存在'];
            }

            return true;

        }

        if (compareStateCode == 1) {
            return ErrorCode['message:类型请求缺少必要参数'];
        } else {
            return ErrorCode['message:类型请求参数错误'];
        }

    }
};


/**
 * 格式化用户数据为json如果数据错误则返回错误码
 * @param userData 用户传入的数据
 */
export function formatUserData(userData: string): standardRequest | number {

    try {

        const result: standardRequest = JSON.parse(userData);

        if (typeof result != 'object' || Array.isArray(result) || !result.type) {
            throw ErrorCode['system:请求参数错误'];
        }

        return result;

    } catch (error) {

        return error;

    }

};

/**
 * 校验传入的数据是否符合要求
 * 
 * - 符合返回解析后的对象
 * - 不符合向用户发送错误信息,然后返回false
 * @param ws webSocket
 * @param data 用户传入的数据对象
 */
export function checkAndFormat(ws: webSocket, data: string): standardRequest | false {

    const requestParam = formatUserData(data),
        requestType = requestParam['type'];

    // 返回错误码
    if (typeof requestParam == 'number') {
        sendErrorMessage(ws, requestParam);
        logError(ErrorCode['error:数据格式化错误'],data);
        return false;
    }

    // 如果没有对应的检测器
    if (!paramCheck[requestType]) {
        sendErrorMessage(ws, ErrorCode['system:请求参数错误']);
        logError(ErrorCode['error:没有对应的检测器'], data);
        return false;
    }

    // 获取校验结果 
    const requestCheckResult = paramCheck[requestType](requestParam);

    // 返回错误码
    if (typeof requestCheckResult == 'number') {
        sendErrorMessage(ws, requestCheckResult);
        logError(ErrorCode['error:数据校检错误'], data);
        return false;
    }

    // 返回格式化合校检后的请求对象
    return requestParam;
};