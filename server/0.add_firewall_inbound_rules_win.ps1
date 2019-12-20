New-NetFirewallRule -DisplayName "IIS Web Client Port (TCP-In 1111)" -Direction Inbound -LocalPort 1111 -RemotePort Any -Protocol TCP -Enabled True
New-NetFirewallRule -DisplayName "Cocos Creator Web Client Port (TCP-In 7456)" -Direction Inbound -LocalPort 7456 -RemotePort Any -Protocol TCP -Enabled True

New-NetFirewallRule -DisplayName "Mahjong Hall Server - Client Port (TCP-In 11110)" -Direction Inbound -LocalPort 9001 -RemotePort Any -Protocol TCP -Enabled True
New-NetFirewallRule -DisplayName "Mahjong Hall Server - Room Port (TCP-In 11111)" -Direction Inbound -LocalPort 11111 -RemotePort Any -Protocol TCP -Enabled True
New-NetFirewallRule -DisplayName "Mahjong Game Server - Client Port (TCP-In 11112)" -Direction Inbound -LocalPort 11112 -RemotePort Any -Protocol TCP -Enabled True
New-NetFirewallRule -DisplayName "Mahjong Game Server - HTTP Port (TCP-In 11113)" -Direction Inbound -LocalPort 11113 -RemotePort Any -Protocol TCP -Enabled True
New-NetFirewallRule -DisplayName "Mahjong Account Server - Client Port (TCP-In 11114)" -Direction Inbound -LocalPort 11114 -RemotePort Any -Protocol TCP -Enabled True
New-NetFirewallRule -DisplayName "Mahjong Account Server - Dealer API Port (TCP-In 11115)" -Direction Inbound -LocalPort 11115 -RemotePort Any -Protocol TCP -Enabled True
