require("colors");

function displayHeader() {
  process.stdout.write("\x1Bc"); 

  console.log(`
            
                                                                                                                                                        
UUUUUUUU     UUUUUUUUTTTTTTTTTTTTTTTTTTTTTTTRRRRRRRRRRRRRRRRR   EEEEEEEEEEEEEEEEEEEEEE       CCCCCCCCCCCCCHHHHHHHHH     HHHHHHHHHTTTTTTTTTTTTTTTTTTTTTTT
U::::::U     U::::::UT:::::::::::::::::::::TR::::::::::::::::R  E::::::::::::::::::::E    CCC::::::::::::CH:::::::H     H:::::::HT:::::::::::::::::::::T
U::::::U     U::::::UT:::::::::::::::::::::TR::::::RRRRRR:::::R E::::::::::::::::::::E  CC:::::::::::::::CH:::::::H     H:::::::HT:::::::::::::::::::::T
UU:::::U     U:::::UUT:::::TT:::::::TT:::::TRR:::::R     R:::::REE::::::EEEEEEEEE::::E C:::::CCCCCCCC::::CHH::::::H     H::::::HHT:::::TT:::::::TT:::::T
 U:::::U     U:::::U TTTTTT  T:::::T  TTTTTT  R::::R     R:::::R  E:::::E       EEEEEEC:::::C       CCCCCC  H:::::H     H:::::H  TTTTTT  T:::::T  TTTTTT
 U:::::D     D:::::U         T:::::T          R::::R     R:::::R  E:::::E            C:::::C                H:::::H     H:::::H          T:::::T        
 U:::::D     D:::::U         T:::::T          R::::RRRRRR:::::R   E::::::EEEEEEEEEE  C:::::C                H::::::HHHHH::::::H          T:::::T        
 U:::::D     D:::::U         T:::::T          R:::::::::::::RR    E:::::::::::::::E  C:::::C                H:::::::::::::::::H          T:::::T        
 U:::::D     D:::::U         T:::::T          R::::RRRRRR:::::R   E:::::::::::::::E  C:::::C                H:::::::::::::::::H          T:::::T        
 U:::::D     D:::::U         T:::::T          R::::R     R:::::R  E::::::EEEEEEEEEE  C:::::C                H::::::HHHHH::::::H          T:::::T        
 U:::::D     D:::::U         T:::::T          R::::R     R:::::R  E:::::E            C:::::C                H:::::H     H:::::H          T:::::T        
 U::::::U   U::::::U         T:::::T          R::::R     R:::::R  E:::::E       EEEEEEC:::::C       CCCCCC  H:::::H     H:::::H          T:::::T        
 U:::::::UUU:::::::U       TT:::::::TT      RR:::::R     R:::::REE::::::EEEEEEEE:::::E C:::::CCCCCCCC::::CHH::::::H     H::::::HH      TT:::::::TT      
  UU:::::::::::::UU        T:::::::::T      R::::::R     R:::::RE::::::::::::::::::::E  CC:::::::::::::::CH:::::::H     H:::::::H      T:::::::::T      
    UU:::::::::UU          T:::::::::T      R::::::R     R:::::RE::::::::::::::::::::E    CCC::::::::::::CH:::::::H     H:::::::H      T:::::::::T      
      UUUUUUUUU            TTTTTTTTTTT      RRRRRRRR     RRRRRRREEEEEEEEEEEEEEEEEEEEEE       CCCCCCCCCCCCCHHHHHHHHH     HHHHHHHHH      TTTTTTTTTTT      
                                                                                                                                                                                                                                                                                                                            

            ${"ðŸ”¥ Join grup TG:".bold} ${"Next Elon 2.0".underline.brightCyan}

            ${"âœ… Prepare faucet MON".bold}
            ${"âœ… 1 IP banyak wallet".bold}
            ${"âŒ gass multi address".bold}
            ${"âœ… Gas fee auto detect".bold}
            ${"âœ… Send address random amount & random generate new address".bold}
            ${"âœ… If the transaction fails, it is very normal because the network is congested,".bold}
            ${"   and the testnet chain, if all of them are successful, is called Mainnet.".bold}

  `.split("\n").join("\n")); 
}

module.exports = displayHeader;
