import React from 'react';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange }) => {
    return (
        <div className='flex justify-center items-center'>
            <div className="launchpad-search-container relative sm:w-[50%] w-full">
                <img className='w-6 h-6 absolute z-50 top-6 left-5 transform -translate-y-1/2' src="/assets/icons/search.svg" alt="" />
                <input
                    className="launchpad-search-input"
                    placeholder="Search"
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            </div>
        </div>
    );
};

export default SearchBar;
