// 사용자에게 보여줘도 되는 쉬운 안내 문구를 담은 오류입니다.
class AppError extends Error {
  constructor(code, message, status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const MESSAGES = {
  LIMIT: '오늘 조회할 수 있는 횟수를 모두 썼어요. 내일 다시 이용해 주세요.',
  UPSTREAM: '정보를 가져오지 못했어요. 잠시 뒤 다시 시도해 주세요.',
  BAD_REQUEST: '요청 내용이 올바르지 않아요. 다시 확인해 주세요.',
  NOT_FOUND: '찾는 정보가 없어요.',
  NO_KEY: '서버 설정이 아직 끝나지 않았어요. 관리자에게 문의해 주세요.',
};

function fail(code, status) {
  return new AppError(code, MESSAGES[code], status);
}

module.exports = { AppError, fail };
