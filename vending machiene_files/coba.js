(function() {

    'use strict';

    const stopCode = '++';

    console.log('To start the Vending Machine, issue vm.Start().');
    console.log('To stop the Vending Machine, type "' + stopCode + '" at any prompt.');

    window.vm = VendingMachine({
        products: {
            'COKE': {
                name: 'Coca Cola',
                price: 129,
                units: 12,
                maxUnits: 20
            },
            'AQUA': {
                name: 'Water',
                price: 99,
                units: 4,
                maxUnits: 20
            }
        },
        coins: {
            '1¢': {
                name: '1 cent',
                price: 1,
                units: 41,
                maxUnits: 50
            },
            '2¢': {
                name: '2 cents',
                price: 2,
                units: 33,
                maxUnits: 50
            },
            '5¢': {
                name: '5 cents',
                price: 5,
                units: 27,
                maxUnits: 50
            },
            '10¢': {
                name: '10 cents',
                price: 10,
                units: 41,
                maxUnits: 50
            },
            '20¢': {
                name: '20 cents',
                price: 20,
                units: 33,
                maxUnits: 50
            },
            '50¢': {
                name: '50 cents',
                price: 50,
                units: 27,
                maxUnits: 50
            },
            '1€': {
                name: '1 euro',
                price: 100,
                units: 41,
                maxUnits: 50
            },
            '2€': {
                name: '2 euros',
                price: 200,
                units: 33,
                maxUnits: 50
            },
        }
    });

    return;


    function VendingMachine(data, displayProvider, promptProvider) {
        var privateStorage = {};

        var ajv = Ajv({
            v5: true
        });
        var valid = ajv.validate(Schema(), data);
        if (!valid) {
            return {
                Start: function() {
                    console.error('Validation Error');
                    console.log(_.map(ajv.errors, function(error) {
                        return error.dataPath + ' ' + error.message;
                    }).join('\n'));
                }
            };
        }

        _.assign(privateStorage, data);

        if (!displayProvider) {
            displayProvider = DisplayProvider();
        }

        if (!promptProvider) {
            promptProvider = PromptProvider();
        }

        var publicStorage = {
            Start: Start
        };

        return publicStorage;


        function Schema() {
            return {
                title: 'Vending Machine Congifuration',
                type: 'object',
                properties: {
                    products: {
                        type: 'object',
                        patternProperties: {
                            '^[\\w-]+$': {
                                '$ref': '#/definitions/slot'
                            }
                        },
                        additionalProperties: false
                    },
                    coins: {
                        type: 'object',
                        patternProperties: {
                            '^(1|2|5|10|20|50)¢|(1|2)€$': {
                                '$ref': '#/definitions/slot'
                            }
                        },
                        additionalProperties: false,
                        required: ['1¢', '2¢', '5¢', '10¢', '20¢', '50¢', '1€', '2€']
                    }
                },
                definitions: {
                    slot: {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                minLength: 1,
                                maxLength: 50
                            },
                            price: {
                                type: 'integer',
                                minimum: 0,
                                maximum: 1000
                            },
                            units: {
                                type: 'integer',
                                minimum: 0,
                                maximum: {
                                    '$data': '1/maxUnits'
                                }
                            },
                            maxUnits: {
                                type: 'integer',
                                minimum: 0
                            }
                        },
                        additionalProperties: false,
                        required: ['name', 'price', 'units', 'maxUnits']
                    }
                },
                additionalProperties: false,
                required: ['products', 'coins']
            };
        }


        function Accessor(type, id, name, value) {
            var types = Object.keys(privateStorage);
            if (_(types).indexOf(type) < 0) {
                throw new Error('Expected a valid type, "' + type + '" given.');
            }
            if (!id) {
                throw new Error('Expected a valid id, "" given.');
            }
            var names = Object.keys(privateStorage[type][id]);
            if (_(names).indexOf(name) < 0) {
                throw new Error('Expected a valid name, "' + name + '" given.');
            }
            switch (typeof value) {
                case 'undefined':
                    var result = privateStorage[type][id][name];
                    return result;
                    break;
                default:
                    privateStorage[type][id][name] = value;
                    return value;
                    break;
            }
        }

        function ProductName(id) {
            var result = Accessor('products', id, 'name');
            return result;
        }

        function ProductPrice(id) {
            var result = Accessor('products', id, 'price');
            return result;
        }

        function ProductUnits(id, increment) {
            if (increment) {
                var stored = ProductUnits(id);
                var result = Accessor('products', id, 'units', stored + increment);
                return result;
            }
            var result = Accessor('products', id, 'units', increment);
            return result;
        }

        function ProductTrayIsFull(id) {
            var result = ProductUnits(id) === Accessor('products', id, 'maxUnits');
            return result;
        }

        function ProductExists(id) {
            var result = typeof privateStorage['products'][id] !== 'undefined';
            return result;
        }


        function CoinName(id) {
            var result = Accessor('coins', id, name, value);
            return result;
        }

        function CoinPrice(id) {
            var result = Accessor('coins', id, 'price');
            return result;
        }

        function CoinUnits(id, increment) {
            if (increment) {
                var stored = CoinUnits(id);
                var result = Accessor('coins', id, 'units', stored + increment);
                return result;
            }
            var result = Accessor('coins', id, 'units');
            return result;
        }

        function CoinTrayIsFull(id) {
            var result = CoinUnits(id) === Accessor('coins', id, 'maxUnits');
            return result;
        }

        function CoinExists(id) {
            var result = !!privateStorage['coins'][id];
            return result;
        }


        function AskProduct() {
            var message = ['',
                'What product would you enjoy now?',
                '',
                'Possible products: ' + Object.keys(privateStorage['products']),
                '',
                ].join('\n');
            var productId = promptProvider.Prompt(message);
            if (!productId) {
                throw new Error('You did not select any product.');
            }
            if (productId === stopCode) {
                Stop();
            }
            if (!ProductExists(productId)) {
                throw new Error('You selected an unknown product.');
            }
            return productId;
        }


        function AskMoney(price, paidCoins) {
            var paid = TotalCoins(paidCoins);
            var message = ['',
                'You already paid ' + NiceMoney(paid) + '.',
                'Please insert ' + NiceMoney(price - paid) + ' more.',
                '',
                'Accepted coins: ' + Object.keys(privateStorage['coins']),
                '',
                ].join('\n');
            var coinId = promptProvider.Prompt(message);
            if (coinId === stopCode) {
                Stop();
            }
            if (!CoinExists(coinId)) {
                ExpellCoins([coinId]);
                coinId = null;
            }
            return coinId;
        }


        function NiceMoney(value) {
            if (value < 100) {
                var result = value + '¢';
                return result;
            }
            var units = ('' + value).split(/\d\d$/)[0] * 1;
            var cents = value - units * 100;
            var result = units + '€' + (cents ? ' ' + cents + '¢' : '');
            return result;
        }


        function KeepMoney(coins) {
            var kept = [];
            _.forEach(coins, function(coinId) {
                if (CoinTrayIsFull(coinId)) {
                    kept = _.countBy(kept, Number);
                    throw new Error('The tray for the ' + coinId + ' coins is full after ' + kept[coinId] + ' coins.')
                }
                kept.push(coinId);
                CoinUnits(coinId, +1);
            });
        }


        function ProvideProduct(id) {
            if (ProductUnits(id) < 1) {
                throw new Error('The ' + ProductName(id) + ' at bay ' + id + ' is exhausted.');
            }
            ProductUnits(id, -1);
        }


        function ProvideCoins(change) {
            var result = [];
            var rest = change;
            while (rest > 0) {
                var coinId = _.findLastKey(privateStorage['coins'], function(coin) {
                    return coin.units > 0 && coin.price <= rest;
                });
                if (!coinId) {
                    throw new Error('Your coins do not allow to return you the change.');
                }
                result.push(coinId);
                CoinUnits(coinId, -1);
                rest -= CoinPrice(coinId);
            }
            return result;
        }


        function CommunicateProblem(e) {
            console.error(e);
            displayProvider.Display(e.message);
        }


        function TotalCoins(coins) {
            var result = _.sum(_.map(coins, CoinPrice));
            return result;
        }


        function StoredUnitsOf(type) {
            var result = _.map(privateStorage[type], function(item, id) {
                return [id + ':', item.units].join(' ');
            });
            result = result.join(', ');
            return result;
        }
        

        function SellProduct() {
            // debugger;
            var backup = _.cloneDeep(privateStorage);
            console.log('Stored products\n  ' + StoredUnitsOf('products'));
            console.log('Stored coins\n  ' + StoredUnitsOf('coins'));
            try {
                var id = AskProduct();
                var price = ProductPrice(id);
                var coins = [];
                var change = -price;
                while (change < 0) {
                    var coin = AskMoney(price, coins);
                    if (coin) {
                        coins.push(coin);
                    }
                    change = TotalCoins(coins) - price;
                }
                KeepMoney(coins);
                ProvideProduct(id);
                change = ProvideCoins(change);

                StoreCoins(coins);
                ExpellProduct(id);
                if (change && change.length > 0) {
                    ExpellChange(change);
                }
            } catch (e) {
                privateStorage = backup;
                if (e === stopCode) {
                    return false;
                }
                CommunicateProblem(e);
                if (coins && coins.length > 0) {
                    ExpellCoins(coins);
                }
            }
            return true;
        }


        function Start() {
            console.log('VendingMachine started.');
            var operating = true;
            while (operating) {
                operating = SellProduct();
            }
        }

        function Stop() {
            console.log('VendingMachine stopped.');
            throw stopCode;
        }


        function StoreCoins(coins) {
            console.warn('MECHANICAL OPERATION - Storing coins...');
            console.log('Stored coins\n  ' + coins);
        }

        function ExpellProduct(id) {
            console.warn('MECHANICAL OPERATION - Expelling product...');
            console.log('Expelled product\n  ' + id);
        }

        function ExpellChange(coins) {
            console.warn('MECHANICAL OPERATION - Expelling change...');
            console.log('Expelled change\n  ' + coins);
        }

        function ExpellCoins(coins) {
            console.warn('MECHANICAL OPERATION - Expelling coins...');
            console.log('Expelled coins\n  ' + coins);
        }


        function PromptProvider() {
            var publicStorage = {
                Prompt: Prompt
            };

            return publicStorage;


            function Prompt(message) {
                var result = window.prompt(message);
                return result;
            }
        }


        function DisplayProvider() {
            var publicStorage = {
                Display: Display
            };

            return publicStorage;


            function Display(message) {
                window.alert(message);
            }
        }

    };

})();