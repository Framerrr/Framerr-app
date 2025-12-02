import React from 'react';

const TailwindTest = () => {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-4">Tailwind CSS Test Page</h1>
            <p className="text-gray-400">This is a development/testing page for Tailwind CSS.</p>
            <div className="mt-4 p-4 bg-accent rounded-lg">
                <p className="text-white">Accent color test</p>
            </div>
        </div>
    );
};

export default TailwindTest;
