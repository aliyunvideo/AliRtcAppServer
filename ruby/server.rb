#!/usr/bin/ruby

require 'optparse'

options = {}
option_parser = OptionParser.new do |opts|
  opts.banner = 'here is help messages of the command line tool.'

  opts.on('-l PORT', '--listen Port', 'Server listen port') do |value|
    options[:listen] = value
  end

  opts.on('-a APPID', '--appid AppID', 'Application ID') do |value|
    options[:appid] = value
  end

  opts.on('-k APPKEY', '--appkey AppKey', 'Application Secret Key') do |value|
    options[:appkey] = value
  end

  opts.on('-g URL', '--gslb URL', 'GSLB service URL') do |value|
    options[:gslb] = value
  end
end.parse!

puts "Listen=#{options[:listen]}, AppID=#{options[:appid]}, AppKey=#{options[:appkey]}, GSLB=#{options[:gslb]}" #options.inspect

require 'sinatra'
require 'digest'

set :port, options[:listen] # default port: 4567

before do
  headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
  headers['Access-Control-Allow-Origin'] = '*'
  headers['Access-Control-Allow-Headers'] = 'accept, authorization, origin'
end

options '*' do
  response.headers['Allow'] = 'HEAD,GET,PUT,DELETE,OPTIONS,POST'
  response.headers['Access-Control-Allow-Headers'] = 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Cache-Control, Accept'
end

get '/app/v1/login' do
  login options, params
end

post '/app/v1/login' do
  login options, params
end

def create_user_id(channel_id, user)
  Digest::SHA256.hexdigest("#{channel_id}/#{user}")[0, 16]
end

def create_token(app_id, app_key, channel_id, user_id, nonce, timestamp)
    Digest::SHA256.hexdigest "#{app_id}#{app_key}#{channel_id}#{user_id}#{nonce}#{timestamp}"
end

def login(options, params)
  # Fetch configure info.
  app_id = options[:appid]
  app_key = options[:appkey]
  gslb = options[:gslb]

  # Get request parameters.
  channel_id = params['room']
  user = params['user']

  # Generate user id
  user_id = create_user_id(channel_id, user)

  # Warning: nonce support the AppKey generated token.
  # the Nonce should be prefix with 'AK-' otherwise the joining verification will failed.
  # eg. nonce: "AK-0464002093ce3dd010cb05356c8b1d0f".
  nonce =  "AK-#{SecureRandom.uuid}"

  # Warning: timestamp is the token expiration time.
  # User can custom defined the expire time of token.
  # eg, Expires in two days. timestamp: 1559890860.
  expire = Time.now + 60*60*24*2 # expired in two days.
  timestamp = (expire.to_f * 1000).to_i/1000

  # Generate token
  token = create_token(app_id, app_key, channel_id, user_id, nonce, timestamp)
  
  username = "#{user_id}?appid=#{app_id}&channel=#{channel_id}&nonce=#{nonce}&timestamp=#{timestamp}"

  puts "Login: appID=#{app_id}, appKey=#{app_key}, channelID=#{channel_id}, userID=#{user_id}, nonce=#{nonce}, timestamp=#{timestamp}, user=#{user}, userName=#{username}, token=#{token}"

  JSON.generate({
    :code => 0,
    :data => {
       :appid => app_id,
       :userid => user_id,
       :gslb => [gslb],
       :token =>  token, 
       :nonce =>  nonce, 
       :timestamp => timestamp,
       :turn =>  {
          :username =>  username,
          :password =>  token
      }
    }
  })
end

