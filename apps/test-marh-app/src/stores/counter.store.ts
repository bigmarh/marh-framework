
export const counterStore = {
  count: 0,
  increment: () => {
    counterStore.count++;
  },
  decrement: () => {
    counterStore.count--;
  }
};