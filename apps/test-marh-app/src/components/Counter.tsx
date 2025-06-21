import { m, MarhComponent } from '@marh/core';
import { counterStore } from '../stores/counter.store';

// Counter component
export const Counter: MarhComponent = {
    view() {
        return <div>
            <div> Counter: {counterStore.count} </div>
            <div className="flex space-x-4">
                <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md" onclick={counterStore.increment}>+</button>
                <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md" onclick={counterStore.decrement}>-</button>
            </div>
        </div>;
    }
};