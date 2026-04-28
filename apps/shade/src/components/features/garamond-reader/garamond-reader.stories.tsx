import type {Meta, StoryObj} from '@storybook/react-vite';
import {GaramondReader, type GaramondReaderProps} from './garamond-reader';

const meta = {
    title: 'Features / Garamond Reader',
    component: GaramondReader,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen'
    }
} satisfies Meta<GaramondReaderProps>;

export default meta;
type Story = StoryObj<GaramondReaderProps>;

const sampleChapter = (
    <>
        <h1>Chapter One — The Lighthouse</h1>
        <p>
            The lamp had not been lit in some seven years. Its frame was rust where it
            had once been brass, and the lens — that great fluted eye that had stared
            down a hundred storms — was clouded over with the salt of a hundred more.
            It is the way of lighthouses to outlive their keepers; it is rarely the
            way of keepers to outlive their lighthouses.
        </p>
        <p>
            On the morning he arrived, the wind was from the north and the gulls were
            from nowhere in particular, and the new keeper — Mr. Idris Calame, of no
            fixed address and several fixed regrets — set down his single bag on the
            single chair in the single room, and decided immediately that he would
            stay.
        </p>
        <h2>A Small Inventory of Light</h2>
        <p>
            He took stock. There was: a bed (one); a stove (one, lit); a kettle (one,
            unlit); and a great many books (twelve, leather-bound, in a language he
            could not read). The books were a problem for tomorrow. The kettle, he
            decided, was a problem for now.
        </p>
        <blockquote>
            “The trouble with the sea,” he said to no one, “is that it has read all
            the same books I have, and remembers them better.”
        </blockquote>
        <p>
            He climbed the iron stair. Three turns and a landing, three turns and a
            landing, until the stair ran out and the world began. From the gallery the
            island was a black comma in a grey sentence; the sentence read,
            <em>weather</em>.
        </p>
        <h3>Of the Lamp Itself</h3>
        <p>
            The lamp, when at last he uncovered it, was smaller than he had imagined
            and older than he had hoped. He laid his hand on the housing and felt, or
            thought he felt, the faintest warmth — as of an animal that had only just
            stopped breathing, and might yet start again, if asked nicely.
        </p>
        <hr />
        <h2>The First Night</h2>
        <p>
            The wind rose. The kettle whistled. Somewhere out at sea, a ship Mr.
            Calame could not see was carrying a letter he would never read, addressed
            to a woman he had once known by another name. The lamp, against every
            expectation including its own, began to turn.
        </p>
    </>
);

export const Light: Story = {
    args: {
        mode: 'light',
        children: sampleChapter
    }
};

export const Dark: Story = {
    args: {
        mode: 'dark',
        children: sampleChapter
    }
};

export const Zen: Story = {
    args: {
        mode: 'zen',
        children: sampleChapter
    }
};

export const Editor: Story = {
    args: {
        mode: 'editor',
        children: sampleChapter
    }
};

export const TheConde: Story = {
    name: 'Pairing: The Condé',
    args: {
        mode: 'light',
        fontPairingId: 'the-conde',
        children: sampleChapter
    }
};

export const TheCassini: Story = {
    name: 'Pairing: The Cassini',
    args: {
        mode: 'dark',
        fontPairingId: 'the-cassini',
        children: sampleChapter
    }
};
