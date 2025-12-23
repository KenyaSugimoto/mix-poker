/**
 * イベントIDを生成する
 */
export const generateId = (): string => {
  return `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

