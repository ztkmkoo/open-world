const SURNAME_ALLOWLIST = [
  "남궁", "제갈", "사공", "황보", "동방", "독고", "모용", "서문", "공손", "상관",
  "강", "김", "유", "윤", "장", "백", "하", "서", "진", "마", "연", "채",
];

const GIVEN_NAME_REGEX = /^[가-힣]{1,3}$/;

module.exports = {
  SURNAME_ALLOWLIST,
  GIVEN_NAME_REGEX,
};
