<?php
header('Content-Type: application/json; charset=utf-8');

class Melody{
    public static function getContent(){
        function isJson($string) {
            json_decode($string);
            return (json_last_error() == JSON_ERROR_NONE);
        };

        $url    = isset($_POST['url'])    ? trim(strip_tags(preg_replace("#(</?\w+)(?:\s(?:[^<>/]|/[^<>])*)?(/?>)#ui", '$1$2', $_POST['url'])))    : '';

        if (!strlen($url)){
            echo json_encode(['error' => 'Invalid URL']);
            return;
        } ;

        if(!preg_match('/^http/i', $url)) $url = $_SERVER["HTTP_REFERER"] . $url;

        $opts = array(
            'http'=>array(
                'method'=>"GET",
                'timeout' => 20
            )
        );
        $context = stream_context_create($opts);
        $file = @file_get_contents($url, false, $context);

        if(isJson($file)){
            echo $file;
        }else{
            echo json_encode(['error' => 'Invalid JSON']);
        }

    }
}

Melody::getContent();
